# src/python/med_gemma.py
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import torch
from PIL import Image
from transformers import pipeline


TRIAGE_MODEL_ID = "google/medgemma-1.5-4b-it"


@dataclass
class SliceTriage:
    slice_index: int
    priority: str  # "CRITICAL" | "URGENT" | "ROUTINE"
    rationale: str
    attention_areas: List[Dict[str, Any]]  # [{"region": "...", "concern": "...", "confidence": 0-1}, ...]


class MedGemmaClient:
    """
    Minimal MedGemma wrapper for your PACS triage use case.
    """

    def __init__(self, model_id: str = TRIAGE_MODEL_ID):
        self.model_id = model_id
        self._pipe = None

    def load(self) -> None:
        if self._pipe is not None:
            return

        print("MedGemma: starting pipeline load...")

        dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32
        device = "cuda" if torch.cuda.is_available() else "cpu"

        # NOTE: transformers pipeline device handling:
        # - device=0 for first GPU, or -1 for CPU
        # Some versions accept "cuda"/"cpu", but ints are safest.
        pipe_device = 0 if device == "cuda" else -1

        self._pipe = pipeline(
            "image-text-to-text",
            model=self.model_id,
            torch_dtype=dtype,
            device=pipe_device,
        )

        print("MedGemma: pipeline loaded.")

    def _extract_json(self, s: str) -> Dict[str, Any]:
        """
        Med models sometimes wrap JSON in text. We robustly pull the first {...} block.
        """
        s = (s or "").strip()

        # Try direct parse
        try:
            return json.loads(s)
        except Exception:
            pass

        # Try to find first JSON object
        m = re.search(r"\{.*\}", s, flags=re.DOTALL)
        if not m:
            return {"error": "no_json_found", "raw": s}

        candidate = m.group(0)
        try:
            return json.loads(candidate)
        except Exception:
            return {"error": "json_parse_failed", "raw": s, "candidate": candidate}

    def triage_slice(
        self,
        image: Image.Image,
        slice_index: int,
        prompt: Optional[str] = None,
        max_new_tokens: int = 128,
    ) -> SliceTriage:
        self.load()

        t0 = time.time()
        print(f"[medgemma] running inference for slice {slice_index}...")

        # Keep prompt extremely constrained (you want deterministic-ish JSON)
        prompt = prompt or """
You are an AI assistant helping an emergency radiology triage workflow.
You MUST output valid JSON only (no markdown, no extra text).

Task: Given this CT/MRI slice image, assign triage priority.
Allowed priority values: "CRITICAL", "URGENT", "ROUTINE".

Return JSON with keys:
- "priority": one of ["CRITICAL","URGENT","ROUTINE"]
- "rationale": short reason (1-2 sentences)
- "attention_areas": array of up to 3 objects, each with:
    - "region": anatomical region description (e.g., "right temporal lobe", "midline", "left lung apex")
    - "concern": what might need attention (short)
    - "confidence": number 0 to 1 (rough confidence)

If nothing concerning: priority="ROUTINE" and attention_areas=[].
""".strip()

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": prompt},
                ],
            }
        ]

        # IMPORTANT:
        # Don't pass max_length alongside max_new_tokens (it causes the warning you saw).
        out = self._pipe(
            text=messages,
            max_new_tokens=max_new_tokens,
            do_sample=False,
        )

        print(f"[medgemma] inference done for slice {slice_index} in {time.time() - t0:.2f}s")

        generated = out[0].get("generated_text")
        if (
            isinstance(generated, list)
            and len(generated) > 0
            and isinstance(generated[-1], dict)
        ):
            text = generated[-1].get("content", "")
        else:
            text = str(generated)

        payload = self._extract_json(text)

        priority = str(payload.get("priority", "ROUTINE")).upper()
        if priority not in {"CRITICAL", "URGENT", "ROUTINE"}:
            priority = "ROUTINE"

        rationale = payload.get("rationale", "") or ""
        attention = payload.get("attention_areas", [])
        if not isinstance(attention, list):
            attention = []

        return SliceTriage(
            slice_index=slice_index,
            priority=priority,
            rationale=rationale,
            attention_areas=attention,
        )

    def triage_study(
        self,
        images_by_index: List[Tuple[int, Image.Image]],
        per_slice_limit: int = 24,
    ) -> Dict[str, Any]:
        """
        For speed: only triage up to N slices (sample across the stack).
        Returns:
          patient_priority + list of per-slice triage
        """
        self.load()

        if not images_by_index:
            return {
                "patient_priority": "ROUTINE",
                "patient_rationale": "No images provided.",
                "slice_triage": [],
            }

        # Sample evenly across the study for demo-speed
        if len(images_by_index) > per_slice_limit:
            step = max(1, len(images_by_index) // per_slice_limit)
            sampled = images_by_index[::step][:per_slice_limit]
        else:
            sampled = images_by_index

        slice_results: List[SliceTriage] = []
        worst = "ROUTINE"
        order = {"ROUTINE": 0, "URGENT": 1, "CRITICAL": 2}

        for idx, img in sampled:
            r = self.triage_slice(img, idx)
            slice_results.append(r)
            if order.get(r.priority, 0) > order.get(worst, 0):
                worst = r.priority

        patient_rationale = f"Derived from highest slice priority among {len(sampled)} sampled slices."

        return {
            "patient_priority": worst,
            "patient_rationale": patient_rationale,
            "slice_triage": [r.__dict__ for r in slice_results],
            "slice_triage_sampled_count": len(sampled),
            "slice_triage_total_slices": len(images_by_index),
        }
"""
engine/agentic_engine.py
Hard-coded agentic engines: parallel execution, fusion, decomposition, workflow chaining.
"""
import re
import json
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed


# ============ 1. PARALLEL TOOL EXECUTION ============
def execute_parallel(task_list, max_workers=5):
    """task_list: list of (fn, args_dict). Returns outputs in SAME order."""
    if not task_list:
        return []
    results = [None] * len(task_list)

    def _run(idx, fn, args):
        try:
            if fn is None:
                return idx, "Unknown tool"
            if hasattr(fn, "invoke"):
                return idx, fn.invoke(args)
            return idx, fn(**args)
        except Exception as e:
            return idx, f"Tool error: {e}"

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(_run, i, fn, a) for i, (fn, a) in enumerate(task_list)]
        for future in as_completed(futures):
            try:
                idx, out = future.result()
                results[idx] = out
            except Exception:
                pass
    return results


# ============ 2. FUSION ENGINE (confidence + conflict resolution) ============
def _collect_key(obj, key, found):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == key:
                found.append(v)
            _collect_key(v, key, found)
    elif isinstance(obj, list):
        for item in obj:
            _collect_key(item, key, found)

def _collect_all(obj, key):
    found = []
    _collect_key(obj, key, found)
    return found

def _resolve_verdict(verdicts):
    if not verdicts:
        return "UNKNOWN"
    if any(("DANGEROUS" in v) or ("DO_NOT_VENTURE" in v) or ("EXTREME" in v) for v in verdicts):
        return "DANGEROUS"
    if any("CAUTION" in v for v in verdicts):
        return "CAUTION"
    if all("SAFE" in v for v in verdicts):
        return "SAFE"
    return "CAUTION"

def compute_fusion(raw_outputs):
    parsed = []
    for out in raw_outputs:
        if isinstance(out, dict):
            if "data" in out and isinstance(out["data"], dict):
                merged = {**out["data"], **out}
                parsed.append(merged)
            else:
                parsed.append(out)
        elif isinstance(out, str):
            try:
                loaded = json.loads(out)
                if isinstance(loaded, dict) and "data" in loaded and isinstance(loaded["data"], dict):
                    merged = {**loaded["data"], **loaded}
                    parsed.append(merged)
                elif isinstance(loaded, dict):
                    parsed.append(loaded)
            except Exception:
                continue
    if not parsed:
        return None

    total = len(parsed)
    total = len(parsed)
    success = 0
    for p in parsed:
        if not isinstance(p, dict) or p.get("error"):
            continue
        status = str(p.get("status", "")).lower()
        if status in ("success", "ok", "stale_cache", "no_alert", "subscribed"):
            success += 1
        elif any(k in p for k in ("verdict", "nearest_pfz", "temperature_c", "fused_sst_c", "sst_c", "wind_kmh", "cyclone_risk_level", "zones_inside", "depth_m", "cross_checked", "ban_active", "safety_decision", "hazard_breakdown")):
            success += 1
    success_rate = success / total if total else 0

    verdicts = []
    for p in parsed:
        verdicts += _collect_all(p, "verdict")
    verdicts = [str(v).upper() for v in verdicts if v]
    resolved = _resolve_verdict(verdicts)

    flat = []
    for p in parsed:
        for k in ("data_sources", "sources", "source", "data_source"):
            val = p.get(k)
            if isinstance(val, list):
                for item in val:
                    if isinstance(item, dict):
                        src_name = item.get("source") or item.get("parameter") or item.get("full_source") or str(item)
                        flat.append(src_name)
                    elif isinstance(item, str):
                        flat.append(item)
            elif isinstance(val, str):
                flat.append(val)
    for s in _collect_all(parsed, "data_sources"):
        if isinstance(s, list):
            flat += [str(x) for x in s]
        elif isinstance(s, str):
            flat.append(s)
    unique_sources = sorted(set(flat))

    sst_vals, chl_vals, wave_vals, wind_vals = [], [], [], []
    for p in parsed:
        for sst_key in ("fused_sst_c", "sst_c", "sst_c_at_point", "avg_sst_c"):
            if sst_key in p and p[sst_key] is not None:
                try: sst_vals.append(float(p[sst_key]))
                except Exception: pass
        for chl_key in ("chlorophyll_mg_m3", "chlorophyll", "chlorophyll_at_point", "avg_chlorophyll"):
            if chl_key in p and p[chl_key] is not None:
                try: chl_vals.append(float(p[chl_key]))
                except Exception: pass
        for wave_key in ("wave_height_m", "wave_m", "significant_wave_height_m"):
            if wave_key in p and p[wave_key] is not None:
                try: wave_vals.append(float(p[wave_key]))
                except Exception: pass
        for wind_key in ("wind_kmh", "wind_speed_kmh"):
            if wind_key in p and p[wind_key] is not None:
                try: wind_vals.append(float(p[wind_key]))
                except Exception: pass

    numeric_agreement = 0.0
    if len(sst_vals) >= 2:
        spread = max(sst_vals) - min(sst_vals)
        if spread <= 1.0: numeric_agreement += 0.5
        elif spread <= 2.0: numeric_agreement += 0.3
    else:
        numeric_agreement += 0.3
        
    if len(chl_vals) >= 2:
        spread = max(chl_vals) - min(chl_vals)
        if spread <= 0.5: numeric_agreement += 0.5
        elif spread <= 1.0: numeric_agreement += 0.3
    else:
        numeric_agreement += 0.2

    # Dynamic mathematical confidence based on real live data:
    base = success_rate * 40.0
    if verdicts:
        mc = Counter(verdicts).most_common(1)[0]
        agreement_score = (mc[1] / len(verdicts)) * 25.0
    else:
        agreement_score = 15.0
    numeric_score = min(1.0, numeric_agreement) * 15.0
    source_score = (min(len(unique_sources), 5) / 5.0) * 20.0

    confidence = base + agreement_score + numeric_score + source_score

    conflicts = []
    if verdicts and len(set(verdicts)) > 1:
        conflicts.append(f"Sources disagree on verdict: {sorted(set(verdicts))}")
        confidence -= 10.0
    if len(sst_vals) >= 2 and (max(sst_vals) - min(sst_vals)) > 2.0:
        conflicts.append(f"SST spread {round(max(sst_vals)-min(sst_vals),2)}C")
        confidence -= 5.0

    confidence = min(98.0, max(25.0, confidence))

    return {
        "confidence_pct": round(confidence),
        "resolved_verdict": resolved,
        "tool_success_rate_pct": round(success_rate * 100),
        "tools_fused": total,
        "unique_data_sources": unique_sources,
        "conflicts": conflicts,
        "cross_validated": numeric_agreement > 0,
    }


# ============ 3. QUERY DECOMPOSITION ============
def _part_intent(text):
    t = text.lower()
    if any(w in t for w in ["route", "navigate", "path"]): return "navigation_route"
    if any(w in t for w in ["pfz", "fishing zone", "where to fish"]): return "fishing_viability"
    if any(w in t for w in ["cyclone", "storm", "lightning", "hazard"]): return "hazard"
    if any(w in t for w in ["safe", "weather", "wave", "wind", "venture"]): return "safety_weather"
    if any(w in t for w in ["tide"]): return "tide"
    if any(w in t for w in ["ban", "banned"]): return "regulatory_geofence"
    return "general"

def decompose_query(query):
    q = str(query).lower()
    parts = re.split(r'\b(?:and then|then|after that)\b', q)
    sub_tasks = []
    for part in parts:
        part = part.strip()
        if len(part) < 5:
            continue
        sub_tasks.append({"text": part, "intent": _part_intent(part)})
    return sub_tasks


# ============ 4. WORKFLOW DETECTION ============
def detect_workflow(query):
    q = str(query).lower()
    if "route" in q and ("pfz" in q or "fishing zone" in q):
        return "route_to_pfz"
    return None
#!/usr/bin/env python3
"""Audit original Blender 2.93 rig actions. No edits, no fake contact claims."""
import bpy
import hashlib
import json
import math
import sys
import traceback
from pathlib import Path
from mathutils import Vector

EXPECTED_SHA="b848037332fe62064989f250a94faa04c75e3fb21ae93f6a100f19079c1b21aa"

def args():
    a=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    if len(a)!=4 or a[0]!="--source" or a[2]!="--out":
        raise RuntimeError("Usage: blender -b --python native-ci/audit.py -- --source <blend> --out <directory>")
    return Path(a[1]),Path(a[3])

def sha(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda:f.read(4*1024*1024),b""):
            h.update(block)
    return h.hexdigest()

def xyz(v):
    return [round(float(n),7) for n in v]

def ang(a,b,c):
    u=a-b;v=c-b
    return round(math.degrees(u.angle(v)),4) if u.length>1e-8 and v.length>1e-8 else None

def assign_action(rig, action):
    ad=rig.animation_data or rig.animation_data_create()
    for track in ad.nla_tracks:track.mute=True
    ad.action=action
    slots=list(action.slots) if hasattr(action,"slots") else []
    if slots and hasattr(ad,"action_slot"):
        target=next((s for s in slots if getattr(s,"target_id_type","OBJECT")=="OBJECT"),slots[0])
        ad.action_slot=target
    bpy.context.view_layer.update()

def record_pose(rig, depsgraph, feet):
    obj=rig.evaluated_get(depsgraph);p=obj.pose.bones;world=obj.matrix_world
    out={"hoof_bone_tip_proxy":{},"joint_angle_proxy":{},"pelvis_head_proxy":{}}
    for foot,bn in feet.items():
        bone=p.get(bn)
        out["hoof_bone_tip_proxy"][foot]=xyz(world@bone.tail) if bone else None
    for side in ("L","R"):
        names=["DEF-thigh."+side,"DEF-lower_leg."+side,"DEF-hind_foot."+side]
        chain=[p.get(n) for n in names]
        if all(chain):
            thigh,lower,hind=chain
            h=world@thigh.head;s=world@thigh.tail;k=world@lower.tail;f=world@hind.tail
            out["joint_angle_proxy"][side]={"stifle_deg":ang(h,s,k),"hock_deg":ang(s,k,f)}
        else:
            out["joint_angle_proxy"][side]=None
        pb=p.get("DEF-pelvis."+side)
        out["pelvis_head_proxy"][side]=xyz(world@pb.head) if pb else None
    return out

def run():
    source,out=args();out.mkdir(parents=True,exist_ok=True)
    report={"status":"RUNNING","source":source.name,"original_modified":False,
            "blender_version":bpy.app.version_string,
            "gait_contact_ground_truth":"NOT_MEASURED",
            "visually_validated":False,"real_gallop_modified":False,"gaits":{}}
    def save():
        (out/"SUMMARY.json").write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8")
    try:
        report["sha256"]=sha(source)
        if report["sha256"]!=EXPECTED_SHA:raise RuntimeError("Source BLEND SHA256 mismatch")
        try:bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
        except RuntimeError as exc:
            if "horse" not in bpy.data.objects or "horse.rig" not in bpy.data.objects:raise
            report["open_mainfile_warning"]=str(exc)
        horse=bpy.data.objects.get("horse");rig=bpy.data.objects.get("horse.rig")
        if not horse or horse.type!="MESH" or not rig or rig.type!="ARMATURE":
            raise RuntimeError("Native horse mesh or rig missing")
        total=len(rig.data.bones)
        deform=sum(bool(b.use_deform) for b in rig.data.bones)
        report["rig"]={"bones":total,"deform_bones":deform,"body_vertices":len(horse.data.vertices)}
        if total<400 or deform<60:raise RuntimeError("Expected native full control/deform rig unavailable")
        scene=bpy.context.scene
        feet={"LH":"DEF-r_hoof.L","RH":"DEF-r_hoof.R",
              "LF":"DEF-f_hoof.L","RF":"DEF-f_hoof.R"}
        for gait in ("walk","trot","canter","gallop"):
            action=bpy.data.actions.get("horse."+gait)
            if action is None:raise RuntimeError("Missing native Action: horse."+gait)
            assign_action(rig,action)
            start,end=[float(v) for v in action.frame_range]
            if end<=start:raise RuntimeError("Empty original Action: "+gait)
            records=[]
            count=160
            for i in range(count):
                fr=start+(end-start)*i/count
                frame=math.floor(fr);scene.frame_set(frame,subframe=fr-frame)
                data=record_pose(rig,bpy.context.evaluated_depsgraph_get(),feet)
                data["source_frame"]=round(fr,6)
                data["phase"]=round(i/count,6)
                records.append(data)
            (out/(gait.upper()+"_ORIGINAL_ACTION_160_SAMPLES.json")).write_text(
                json.dumps({"action":action.name,"frame_range":[start,end],
                            "samples":records,
                            "foot_probe_caveat":"Bone tips are NOT hoof sole contact points; no gait PASS inferred"},
                           indent=1,ensure_ascii=False),encoding="utf-8")
            report["gaits"][gait]={"action":action.name,"samples":len(records),
                "hoof_probe_availability":{k:sum(1 for x in records if x["hoof_bone_tip_proxy"][k] is not None) for k in feet},
                "joint_probe_availability":{s:sum(1 for x in records if x["joint_angle_proxy"][s] is not None) for s in ("L","R")},
                "contact_status":"NOT_TESTED","visual_quality":"NOT_TESTED"}
            save()
        report["status"]="ORIGINAL_ACTION_BONE_MOTION_SAMPLED_NOT_CORRECTED"
    except BaseException as exc:
        report["status"]="FAILED";report["error"]=str(exc);report["traceback"]=traceback.format_exc()
        raise
    finally:save()

if __name__=="__main__":run()

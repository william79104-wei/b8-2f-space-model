import bpy
import os

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

path = r"C:\Users\USER\Documents\Codex\2026-09-14\referenced-chatgpt-conversation-this-is-an\work\b8-model\deliverables\B8-2F_幾何模型_v0.3.glb"
bpy.ops.import_scene.gltf(filepath=path)
for obj in sorted(bpy.context.scene.objects, key=lambda o: o.name):
    if obj.type == 'MESH':
        if obj.name.startswith('floor-') or obj.name in {'mainbath-west','tv','tv-console'}:
            print(obj.name, 'loc=', tuple(round(v,3) for v in obj.location), 'dim=', tuple(round(v,3) for v in obj.dimensions))

import bpy
import os
from mathutils import Vector

ROOT = r"C:\Users\USER\Documents\Codex\2026-09-14\referenced-chatgpt-conversation-this-is-an\work\b8-model"
OUT = r"C:\Users\USER\Documents\Codex\2026-09-14\referenced-chatgpt-conversation-this-is-an\outputs"
GLB = os.path.join(ROOT, 'deliverables', 'B8-2F_幾何模型_v0.3.glb')
os.makedirs(OUT, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)


def make_k635_material():
    mat = bpy.data.materials.new('K635 木地板・暖灰棕 PBR 近似')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    out.location = (650, 0)
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (390, 0)
    bsdf.inputs['Roughness'].default_value = 0.62
    bsdf.inputs['Specular IOR Level'].default_value = 0.16
    tex = nodes.new('ShaderNodeTexCoord')
    tex.location = (-760, 0)
    mapping = nodes.new('ShaderNodeMapping')
    mapping.location = (-590, 0)
    mapping.inputs['Scale'].default_value = (1.0, 18.0, 1.0)
    noise = nodes.new('ShaderNodeTexNoise')
    noise.location = (-380, 130)
    noise.inputs['Scale'].default_value = 2.4
    noise.inputs['Detail'].default_value = 4.0
    noise.inputs['Roughness'].default_value = 0.68
    mix = nodes.new('ShaderNodeMixRGB')
    mix.location = (-130, 80)
    mix.blend_type = 'MIX'
    mix.inputs[0].default_value = 0.0
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.location = (95, 90)
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[0].color = (0.033, 0.025, 0.021, 1.0)
    mid = ramp.color_ramp.elements.new(0.51)
    mid.color = (0.085, 0.062, 0.052, 1.0)
    ramp.color_ramp.elements[1].position = 0.72
    ramp.color_ramp.elements[1].color = (0.205, 0.15, 0.125, 1.0)
    fine = nodes.new('ShaderNodeTexNoise')
    fine.location = (-330, -300)
    fine.inputs['Scale'].default_value = 7.0
    fine.inputs['Detail'].default_value = 3.0
    fine.inputs['Roughness'].default_value = 0.82
    bump = nodes.new('ShaderNodeBump')
    bump.location = (190, -130)
    bump.inputs['Strength'].default_value = 0.28
    bump.inputs['Distance'].default_value = 0.04
    rough = nodes.new('ShaderNodeValToRGB')
    rough.location = (120, -320)
    rough.color_ramp.elements[0].position = 0.25
    rough.color_ramp.elements[0].color = (0.45, 0.45, 0.45, 1.0)
    rough.color_ramp.elements[1].position = 0.75
    rough.color_ramp.elements[1].color = (0.72, 0.72, 0.72, 1.0)
    links.new(tex.outputs['Generated'], mapping.inputs['Vector'])
    links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    links.new(mapping.outputs['Vector'], fine.inputs['Vector'])
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(fine.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    links.new(fine.outputs['Fac'], rough.inputs['Fac'])
    links.new(rough.outputs['Color'], bsdf.inputs['Roughness'])
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def make_seam_material():
    mat = bpy.data.materials.new('K635 板縫底色')
    mat.diffuse_color = (0.018, 0.011, 0.008, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF') or mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.003, 0.002, 0.0015, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.95
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.0
    return mat


def add_plank_overlay(floor_obj, material, seam_material):
    # Imported GLB floors are 1 Blender unit = 1 metre. Add thin real boards
    # above each source floor, retaining the source box as a dark seam underlay.
    x0 = floor_obj.location.x - floor_obj.dimensions.x / 2
    x1 = floor_obj.location.x + floor_obj.dimensions.x / 2
    y0 = floor_obj.location.y - floor_obj.dimensions.y / 2
    y1 = floor_obj.location.y + floor_obj.dimensions.y / 2
    z = floor_obj.location.z + floor_obj.dimensions.z / 2 + 0.009
    # Keep the visible joint close to a real laminate installation seam.
    # The gap is subtracted from both adjacent boards, so 1.5 mm here reads
    # as roughly 3 mm between boards instead of the previous 8 mm visual gap.
    board_length, board_width, gap, thickness = 1.80, 0.22, 0.0008, 0.018
    offsets = (0.0, 0.62, 0.22, 0.96)
    rows = int((y1 - y0) / (board_width + gap)) + 1
    for row in range(rows):
        y_min = y0 + row * (board_width + gap)
        y_max = min(y1, y_min + board_width)
        if y_max - y_min < 0.06:
            continue
        cursor = x0 - offsets[row % len(offsets)]
        index = 0
        while cursor < x1:
            seg_min = max(x0, cursor)
            seg_max = min(x1, cursor + board_length)
            if seg_max - seg_min > 0.08:
                bpy.ops.mesh.primitive_cube_add(location=((seg_min + seg_max) / 2, (y_min + y_max) / 2, z))
                board = bpy.context.object
                board.name = f'K635_{floor_obj.name}_{row}_{index}'
                board.dimensions = (seg_max - seg_min - gap, y_max - y_min - gap, thickness)
                bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
                board.data.materials.append(material)
                # Keep board edges square in the first architectural preview.
                # A bevel catches the area lights and reads as bright white seams
                # at this top-down scale; the dark underlay supplies the joints.
            cursor += board_length
            index += 1


clear_scene()
bpy.ops.import_scene.gltf(filepath=GLB)
wood = make_k635_material()
seam = make_seam_material()
wood_ids = {'floor-living', 'floor-master', 'floor-closet', 'floor-tatami', 'floor-kitchen'}
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and obj.name in wood_ids:
        obj.data.materials.clear()
        obj.data.materials.append(seam)
        # Imported GLB meshes can retain polygon material indices after the
        # slot list is replaced. Force every underlay face to the dark seam
        # material so no original light floor material shows through joints.
        for poly in obj.data.polygons:
            poly.material_index = 0
        add_plank_overlay(obj, wood, seam)
        obj['finish'] = 'Euro Home 優境 K635 灰棕色近似'
        obj['finish_source'] = '使用者提供 K635 樣板及鋪設照片'
        obj['finish_note'] = '程序材質預覽；實際批次、木紋、光澤與施工方向待樣品確認'

# Neutral architectural lighting for the first whole-home preview.
bpy.ops.object.light_add(type='AREA', location=(2.0, -3.0, 10.5))
key = bpy.context.object
key.name = '全屋主光'
key.data.energy = 1900
key.data.shape = 'DISK'
key.data.size = 6.5
key.data.color = (1.0, 0.91, 0.82)
look_at(key, (4.3, 3.7, 0.0))
bpy.ops.object.light_add(type='AREA', location=(10.0, 4.0, 7.0))
fill = bpy.context.object
fill.name = '全屋補光'
fill.data.energy = 1100
fill.data.shape = 'DISK'
fill.data.size = 5.0
fill.data.color = (0.82, 0.88, 1.0)
look_at(fill, (4.3, 3.7, 0.0))
bpy.ops.object.light_add(type='AREA', location=(4.0, 9.0, 5.0))
back = bpy.context.object
back.name = '窗側柔光'
back.data.energy = 900
back.data.shape = 'RECTANGLE'
back.data.size = 4.0
back.data.size_y = 3.0
back.data.color = (1.0, 0.95, 0.86)
look_at(back, (4.3, 3.7, 0.0))

bpy.ops.object.camera_add(location=(4.4, 3.8, 15.0))
camera = bpy.context.object
camera.name = '全屋俯視渲染鏡頭'
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 9.6
look_at(camera, (4.3, 3.65, 0.2))
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1280
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.render.filepath = os.path.join(OUT, 'B8-2F_住宅_K635_全屋俯視預覽.png')
scene.world.color = (0.035, 0.03, 0.026)
scene.view_settings.look = 'AgX - Medium High Contrast'
scene['source_model'] = 'B8-2F_幾何模型_v0.3.glb'
scene['finish_applied'] = 'floor-living, floor-master, floor-closet, floor-tatami, floor-kitchen'
scene['finish_reference'] = 'Euro Home 優境 K635；使用者提供樣板與鋪設照片'

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'B8-2F_住宅_K635_材質版.blend'))
bpy.ops.render.render(write_still=True)

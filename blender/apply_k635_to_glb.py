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


def make_k635_material(name='K635 木地板・暖灰棕 PBR 近似', tone_scale=1.0, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
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
    if emission_strength and 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = (0.07, 0.035, 0.022, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
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
    ramp.color_ramp.elements[0].color = (0.033 * tone_scale, 0.025 * tone_scale, 0.021 * tone_scale, 1.0)
    mid = ramp.color_ramp.elements.new(0.51)
    mid.color = (0.085 * tone_scale, 0.062 * tone_scale, 0.052 * tone_scale, 1.0)
    ramp.color_ramp.elements[1].position = 0.72
    ramp.color_ramp.elements[1].color = (0.205 * tone_scale, 0.15 * tone_scale, 0.125 * tone_scale, 1.0)
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


def make_simple_material(name, color, roughness=0.5, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf is None:
        bsdf = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Metallic' in bsdf.inputs:
        bsdf.inputs['Metallic'].default_value = metallic
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.22 if metallic == 0 else 0.5
    return mat


def rounded_cube(name, location, dimensions, material, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('柔和圓角', 'BEVEL')
        mod.width = min(bevel, min(dimensions) / 3)
        mod.segments = 3
    obj.data.materials.append(material)
    return obj


def cylinder(name, location, radius, depth, material, vertices=32, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                        location=location, rotation=rotation or (0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def uv_sphere(name, location, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj


def hide_objects(names):
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj:
            obj.hide_render = True
            obj.hide_viewport = True


def add_real_toilet(prefix, center, porcelain, chrome, face_positive_y=True):
    """Compact floor toilet, proportioned from the builder TOTO reference photo."""
    x, y = center
    sign = 1 if face_positive_y else -1
    rounded_cube(f'{prefix}-bowl', (x, y + sign * 0.08, 0.20), (0.38, 0.50, 0.18), porcelain, 0.08)
    rounded_cube(f'{prefix}-seat', (x, y + sign * 0.10, 0.32), (0.34, 0.44, 0.045), porcelain, 0.06)
    rounded_cube(f'{prefix}-tank', (x, y - sign * 0.22, 0.47), (0.38, 0.17, 0.48), porcelain, 0.04)
    rounded_cube(f'{prefix}-lid', (x, y - sign * 0.16, 0.70), (0.34, 0.13, 0.035), porcelain, 0.025)
    cylinder(f'{prefix}-flush', (x, y - sign * 0.24, 0.72), 0.025, 0.012, chrome, vertices=24, rotation=(0, 0, 0))


def add_real_basin(prefix, center, porcelain, cabinet_mat, chrome):
    x, y = center
    rounded_cube(f'{prefix}-cabinet', (x, y, 0.36), (0.60, 0.45, 0.72), cabinet_mat, 0.025)
    rounded_cube(f'{prefix}-counter', (x, y, 0.75), (0.64, 0.49, 0.07), porcelain, 0.025)
    rounded_cube(f'{prefix}-basin', (x, y, 0.80), (0.48, 0.31, 0.10), porcelain, 0.06)
    cylinder(f'{prefix}-faucet', (x, y - 0.10, 0.94), 0.022, 0.20, chrome, vertices=24)
    cylinder(f'{prefix}-drain', (x, y + 0.02, 0.855), 0.025, 0.006, chrome, vertices=24)


def add_real_bathtub(center, porcelain, water, chrome):
    x, y = center
    rounded_cube('main-bathtub-real', (x, y, 0.275), (0.71, 1.28, 0.55), porcelain, 0.09)
    rounded_cube('main-bathtub-water-real', (x, y, 0.535), (0.55, 1.08, 0.035), water, 0.10)
    rounded_cube('main-bathtub-rim-real', (x, y, 0.57), (0.64, 1.20, 0.06), porcelain, 0.08)
    rounded_cube('main-bathtub-water-surface', (x, y, 0.585), (0.52, 1.05, 0.012), water, 0.08)
    # Wall-mounted mixer and hand shower, attached to the right-side wall.
    cylinder('main-shower-riser-real', (x + 0.445, y, 1.22), 0.018, 0.80, chrome, vertices=24)
    uv_sphere('main-shower-head-real', (x + 0.445, y, 1.65), (0.10, 0.04, 0.10), chrome)
    rounded_cube('main-shower-mixer-real', (x + 0.42, y, 0.93), (0.06, 0.12, 0.08), chrome, 0.02)


def add_real_kitchen(cabinet_mat, white, black, steel, dark):
    # Builder layout: tall bank at X 275–336 cm, along Y 530–755 cm.
    x_front = 2.735
    x_center = 3.055
    y0, y1 = 5.30, 7.55
    rounded_cube('kitchen-base-real', (x_center, (y0 + y1) / 2, 0.425), (0.61, y1 - y0, 0.85), cabinet_mat, 0.015)
    rounded_cube('kitchen-counter-real', (x_center, (y0 + y1) / 2, 0.88), (0.64, y1 - y0, 0.06), white, 0.025)
    # Separate door and drawer fronts matching the supplied builder photos.
    segments = [(5.30, 5.72), (5.74, 6.14), (6.16, 6.62), (6.64, 7.08), (7.10, 7.55)]
    for i, (a, b) in enumerate(segments):
        rounded_cube(f'kitchen-front-real-{i+1}', (x_front, (a + b) / 2, 0.43), (0.025, b - a - 0.02, 0.72), cabinet_mat, 0.012)
        cylinder(f'kitchen-handle-real-{i+1}', (x_front - 0.018, (a + b) / 2, 0.47), 0.012, 0.16, steel, vertices=16, rotation=(0, 1.5708, 0))
    # Stainless sink at the supplied sink position.
    rounded_cube('kitchen-sink-real', (3.035, 5.77, 0.915), (0.43, 0.50, 0.035), steel, 0.035)
    rounded_cube('kitchen-sink-bowl-real', (3.035, 5.77, 0.89), (0.33, 0.36, 0.08), dark, 0.045)
    cylinder('kitchen-faucet-real', (3.035, 5.52, 1.03), 0.022, 0.34, steel, vertices=24)
    uv_sphere('kitchen-faucet-arc-real', (3.035, 5.42, 1.17), (0.10, 0.025, 0.10), steel)
    # Black two-zone hob and simple burners.
    rounded_cube('kitchen-hob-real', (3.035, 6.99, 0.915), (0.43, 0.54, 0.025), black, 0.025)
    for yy in (6.86, 7.12):
        cylinder('kitchen-burner-real', (3.035, yy, 0.934), 0.075, 0.008, dark, vertices=32)
        cylinder('kitchen-burner-ring-real', (3.035, yy, 0.939), 0.052, 0.010, steel, vertices=32)
    # 475 L reference refrigerator: 65 × 65.1 × 183.3 cm.
    rounded_cube('fridge-real', (3.055, 4.952, 0.9165), (0.65, 0.651, 1.833), steel, 0.035)
    rounded_cube('fridge-door-left-real', (3.055, 4.78, 0.93), (0.58, 0.015, 1.65), white, 0.025)
    rounded_cube('fridge-door-right-real', (3.055, 5.12, 0.93), (0.58, 0.015, 1.65), white, 0.025)
    cylinder('fridge-handle-left-real', (2.78, 4.87, 0.98), 0.012, 0.52, steel, vertices=16, rotation=(1.5708, 0, 0))
    cylinder('fridge-handle-right-real', (2.78, 5.03, 0.98), 0.012, 0.52, steel, vertices=16, rotation=(1.5708, 0, 0))


def add_real_living_sofa(fabric, dark_wood):
    # Keep the confirmed left-side placement and facing direction.
    rounded_cube('sofa-real-base', (3.16, 2.225, 0.16), (0.78, 1.65, 0.30), dark_wood, 0.06)
    rounded_cube('sofa-real-back', (2.84, 2.225, 0.58), (0.16, 1.65, 0.62), fabric, 0.08)
    rounded_cube('sofa-real-seat-a', (3.22, 1.85, 0.39), (0.62, 0.72, 0.18), fabric, 0.07)
    rounded_cube('sofa-real-seat-b', (3.22, 2.60, 0.39), (0.62, 0.72, 0.18), fabric, 0.07)
    rounded_cube('sofa-real-arm-a', (3.22, 1.445, 0.52), (0.66, 0.10, 0.42), fabric, 0.05)
    rounded_cube('sofa-real-arm-b', (3.22, 3.005, 0.52), (0.66, 0.10, 0.42), fabric, 0.05)
    for xx in (2.88, 3.44):
        for yy in (1.55, 2.90):
            rounded_cube('sofa-real-leg', (xx, yy, 0.06), (0.05, 0.05, 0.12), dark_wood, 0.01)


def add_real_master_bed(bed_wood, fabric, accent):
    rounded_cube('master-bed-real-frame', (7.51, 6.04, 0.16), (1.92, 1.86, 0.28), bed_wood, 0.06)
    rounded_cube('master-bed-real-mattress', (7.51, 6.04, 0.40), (1.82, 1.76, 0.24), fabric, 0.07)
    rounded_cube('master-bed-real-duvet', (7.25, 6.04, 0.54), (1.25, 1.70, 0.10), accent, 0.06)
    rounded_cube('master-bed-real-headboard', (8.42, 6.04, 0.75), (0.10, 1.82, 0.85), bed_wood, 0.025)
    rounded_cube('master-bed-real-pillow-a', (8.08, 5.62, 0.57), (0.36, 0.56, 0.10), fabric, 0.05)
    rounded_cube('master-bed-real-pillow-b', (8.08, 6.46, 0.57), (0.36, 0.56, 0.10), fabric, 0.05)
    rounded_cube('master-daybed-real-base', (7.307, 7.25, 0.18), (2.685, 0.60, 0.30), bed_wood, 0.04)
    rounded_cube('master-daybed-real-cushion', (7.307, 7.25, 0.40), (2.55, 0.52, 0.18), accent, 0.06)


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

# Replace the original block placeholders with physical, stylised fixtures.
hide_objects({
    'sofa-base', 'sofa-back', 'sofa-seat-1', 'sofa-seat-2', 'sofa-arm-a', 'sofa-arm-b',
    'master-bed', 'master-daybed', 'master-pillow-a', 'master-pillow-b',
    'kitchen-base', 'kitchen-counter', 'sink', 'hob', 'fridge',
    'bath-tub', 'bath-tub-water', 'main-wash', 'bath-wash', 'main-wc', 'bath-wc',
    'main-shower-faucet'
})
porcelain = make_simple_material('衛浴陶瓷・霧白', (0.88, 0.89, 0.86), roughness=0.25)
white = make_simple_material('廚房白色檯面', (0.86, 0.84, 0.78), roughness=0.30)
water = make_simple_material('浴缸水面', (0.32, 0.55, 0.58), roughness=0.18)
chrome = make_simple_material('鉻色五金', (0.55, 0.58, 0.56), roughness=0.16, metallic=0.92)
steel = make_simple_material('不鏽鋼', (0.42, 0.45, 0.44), roughness=0.26, metallic=0.82)
black = make_simple_material('黑色玻璃爐具', (0.012, 0.014, 0.013), roughness=0.18, metallic=0.15)
dark = make_simple_material('深色內槽', (0.035, 0.045, 0.043), roughness=0.34, metallic=0.25)
cabinet = make_simple_material('建商廚具灰棕木紋', (0.19, 0.125, 0.085), roughness=0.42)
bed_wood = make_simple_material('主臥家具暖木', (0.22, 0.14, 0.095), roughness=0.46)
fabric = make_simple_material('主臥與客廳暖灰布料', (0.30, 0.235, 0.18), roughness=0.78)
accent = make_simple_material('床品米灰', (0.54, 0.44, 0.34), roughness=0.82)
sofa_fabric = make_simple_material('沙發暖灰棕布', (0.26, 0.19, 0.14), roughness=0.82)
dark_wood = make_simple_material('沙發深木腳', (0.075, 0.045, 0.028), roughness=0.50)

add_real_toilet('main-wc-real', (6.47, 1.97), porcelain, chrome, face_positive_y=True)
add_real_toilet('bath-wc-real', (7.125, 0.40), porcelain, chrome, face_positive_y=True)
add_real_basin('main-wash-real', (7.50, 1.925), porcelain, cabinet, chrome)
add_real_basin('bath-wash-real', (6.345, 0.33), porcelain, cabinet, chrome)
add_real_bathtub((8.205, 2.35), porcelain, water, chrome)
add_real_kitchen(cabinet, white, black, steel, dark)
add_real_living_sofa(sofa_fabric, dark_wood)
add_real_master_bed(bed_wood, fabric, accent)

# Recolour the existing tatami/desk cabinetry to sit with K635 without
# changing its confirmed geometry or platform height.
tatami_finish = make_simple_material('次臥家具・K635協調暖木', (0.20, 0.135, 0.09), roughness=0.52)
for name in ('tatami-platform', 'tatami-desk', 'tatami-entry-cabinet'):
    obj = bpy.data.objects.get(name)
    if obj and obj.type == 'MESH':
        obj.data.materials.clear()
        obj.data.materials.append(tatami_finish)
        obj['finish_note'] = '依使用者提供 K635 木地板色調配色；幾何位置維持原模型'

# Bathroom wall finishes follow the supplied grey stone tile references.
bath_wall = make_simple_material('衛浴灰色石紋牆磚參考', (0.26, 0.25, 0.24), roughness=0.72)
for name in ('mainbath-west', 'bath-divider', 'bath-west-a', 'bath-west-head', 'closet-bath-a', 'closet-bath-b', 'closet-bath-head'):
    obj = bpy.data.objects.get(name)
    if obj and obj.type == 'MESH':
        obj.data.materials.clear()
        obj.data.materials.append(bath_wall)

# Neutral architectural lighting for the first whole-home preview.
bpy.ops.object.light_add(type='AREA', location=(4.3, 3.7, 25.0))
key = bpy.context.object
key.name = '全屋主光'
key.data.energy = 2600
key.data.shape = 'DISK'
key.data.size = 14.0
key.data.color = (1.0, 0.94, 0.88)
look_at(key, (4.3, 3.7, 0.0))
bpy.ops.object.light_add(type='AREA', location=(10.0, 4.0, 20.0))
fill = bpy.context.object
fill.name = '全屋補光'
fill.data.energy = 320
fill.data.shape = 'DISK'
fill.data.size = 5.0
fill.data.color = (0.86, 0.9, 1.0)
look_at(fill, (4.3, 3.7, 0.0))
bpy.ops.object.light_add(type='AREA', location=(4.0, 9.0, 20.0))
back = bpy.context.object
back.name = '窗側柔光'
back.data.energy = 300
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
scene.render.filepath = os.path.join(OUT, 'B8-2F_住宅_完整實體渲染.png')
scene.world.color = (0.035, 0.03, 0.026)
scene.view_settings.look = 'AgX - Medium High Contrast'
scene['source_model'] = 'B8-2F_幾何模型_v0.3.glb'
scene['finish_applied'] = 'floor-living, floor-master, floor-closet, floor-tatami, floor-kitchen'
scene['finish_reference'] = 'Euro Home 優境 K635；使用者提供樣板與鋪設照片'
scene['fixture_reference'] = '使用者提供建商衛浴／廚具照片；未提供品項以市售比例建立參考實體'

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'B8-2F_住宅_完整實體版.blend'))
bpy.ops.render.render(write_still=True)

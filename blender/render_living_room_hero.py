import bpy
import os
from mathutils import Vector

ROOT = r'C:\Users\USER\Documents\Codex\2026-09-14\referenced-chatgpt-conversation-this-is-an\work\b8-model'
OUT = r'C:\Users\USER\Documents\Codex\2026-09-14\referenced-chatgpt-conversation-this-is-an\outputs'
os.makedirs(OUT, exist_ok=True)


def mat(name, color, roughness=0.5, metallic=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    bsdf = next((n for n in nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'), None)
    if bsdf is None:
        bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    output = next((n for n in nodes if n.bl_idname == 'ShaderNodeOutputMaterial'), None)
    if output is None:
        output = nodes.new('ShaderNodeOutputMaterial')
    if not any(link.from_node == bsdf and link.to_node == output for link in m.node_tree.links):
        m.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Metallic' in bsdf.inputs:
        bsdf.inputs['Metallic'].default_value = metallic
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.28 if metallic == 0 else 0.55
    return m


def fabric_mat(name, base):
    m = mat(name, base, roughness=0.86)
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    bsdf = next((n for n in nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'), None)
    tex = nodes.new('ShaderNodeTexNoise')
    tex.inputs['Scale'].default_value = 38.0
    tex.inputs['Detail'].default_value = 2.0
    tex.inputs['Roughness'].default_value = 0.75
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.16
    bump.inputs['Distance'].default_value = 0.025
    links.new(tex.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def rounded_cube(name, loc, dims, material, bevel=0.05):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        b = o.modifiers.new('家具圓角', 'BEVEL')
        b.width = min(bevel, min(dims) / 3)
        b.segments = 6
    o.data.materials.append(material)
    return o


def cylinder(name, loc, radius, depth, material, rotation=(0, 0, 0), vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                        location=loc, rotation=rotation)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    b = o.modifiers.new('家具圓角', 'BEVEL')
    b.width = min(radius * 0.22, depth * 0.20)
    b.segments = 4
    return o


def uv_sphere(name, loc, scale, material, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, location=loc, rotation=rotation)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    return o


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def hide(name):
    o = bpy.data.objects.get(name)
    if o:
        o.hide_render = True
        o.hide_viewport = True


def add_sofa(fabric, light_fabric, wood, accent):
    for name in ('sofa-real-base', 'sofa-real-back', 'sofa-real-seat-a', 'sofa-real-seat-b',
                 'sofa-real-arm-a', 'sofa-real-arm-b'):
        hide(name)
    # Confirmed left placement, facing the TV wall on the right (+X).
    rounded_cube('hero-sofa-base', (3.16, 2.225, 0.18), (0.78, 1.65, 0.30), wood, 0.08)
    rounded_cube('hero-sofa-back-shell', (2.84, 2.225, 0.64), (0.15, 1.65, 0.70), fabric, 0.10)
    rounded_cube('hero-sofa-seat-left', (3.20, 1.82, 0.42), (0.61, 0.70, 0.20), light_fabric, 0.10)
    rounded_cube('hero-sofa-seat-right', (3.20, 2.63, 0.42), (0.61, 0.70, 0.20), light_fabric, 0.10)
    rounded_cube('hero-sofa-arm-left', (3.20, 1.42, 0.60), (0.65, 0.13, 0.48), fabric, 0.08)
    rounded_cube('hero-sofa-arm-right', (3.20, 3.03, 0.60), (0.65, 0.13, 0.48), fabric, 0.08)
    # Back cushions with a slight lean and soft top roll.
    rounded_cube('hero-sofa-back-cushion-left', (2.98, 1.82, 0.78), (0.16, 0.67, 0.48), light_fabric, 0.10)
    rounded_cube('hero-sofa-back-cushion-right', (2.98, 2.63, 0.78), (0.16, 0.67, 0.48), light_fabric, 0.10)
    # Two contrasting throw pillows add scale and material variation.
    uv_sphere('hero-sofa-pillow-terracotta', (3.05, 1.58, 0.88), (0.18, 0.08, 0.16), accent, rotation=(0, 0, -0.12))
    uv_sphere('hero-sofa-pillow-olive', (3.05, 2.86, 0.88), (0.17, 0.08, 0.15), mat('客廳橄欖綠抱枕', (0.16, 0.20, 0.12), 0.9), rotation=(0, 0, 0.12))
    for xx in (2.88, 3.44):
        for yy in (1.55, 2.90):
            rounded_cube('hero-sofa-leg', (xx, yy, 0.06), (0.045, 0.045, 0.12), wood, 0.012)


def add_coffee_table(wood, metal):
    rug = mat('客廳暖灰地毯', (0.22, 0.18, 0.13), 0.92)
    rounded_cube('hero-living-rug', (4.25, 2.23, 0.022), (1.55, 1.75, 0.025), rug, 0.035)
    rounded_cube('hero-coffee-table-top', (4.25, 2.23, 0.43), (0.92, 0.54, 0.07), wood, 0.08)
    cylinder('hero-coffee-table-leg-center', (4.25, 2.23, 0.20), 0.12, 0.36, metal, vertices=48)
    cylinder('hero-coffee-table-foot', (4.25, 2.23, 0.045), 0.25, 0.035, metal, vertices=48)


def add_tv_wall(wood, console):
    old = bpy.data.objects.get('tv-console')
    if old:
        old.hide_render = True
        old.hide_viewport = True
    # TV wall is the confirmed main-bath shared wall; keep TV itself in place.
    rounded_cube('hero-tv-console-body', (5.70, 2.36, 0.22), (0.34, 1.62, 0.44), console, 0.035)
    rounded_cube('hero-tv-console-top', (5.66, 2.36, 0.46), (0.42, 1.70, 0.06), wood, 0.025)
    for yy in (1.84, 2.36, 2.88):
        rounded_cube('hero-tv-console-door', (5.50, yy, 0.25), (0.012, 0.45, 0.30), wood, 0.012)
        cylinder('hero-tv-console-knob', (5.47, yy, 0.25), 0.012, 0.035, mat('電視櫃把手', (0.36, 0.36, 0.32), 0.25, 0.8), rotation=(0, 1.5708, 0), vertices=24)
    slat = mat('電視牆暖木格柵', (0.16, 0.09, 0.045), 0.45)
    for i in range(9):
        yy = 1.55 + i * 0.19
        rounded_cube('hero-tv-wall-slat', (5.89, yy, 1.55), (0.025, 0.055, 2.40), slat, 0.008)


def main():
    fabric = fabric_mat('客廳沙發深暖灰布料', (0.20, 0.14, 0.095))
    light_fabric = fabric_mat('客廳沙發坐墊米灰布料', (0.36, 0.29, 0.22))
    wood = mat('客廳暖胡桃木家具', (0.18, 0.095, 0.045), 0.46)
    console = mat('電視櫃深灰棕木皮', (0.07, 0.045, 0.028), 0.50)
    metal = mat('茶几黑鐵腳', (0.025, 0.027, 0.025), 0.28, 0.75)
    accent = mat('客廳磚紅抱枕', (0.34, 0.12, 0.055), 0.88)
    add_sofa(fabric, light_fabric, wood, accent)
    add_coffee_table(wood, metal)
    add_tv_wall(wood, console)

    # Hero camera: inside the living room, looking diagonally toward the TV wall.
    bpy.ops.object.camera_add(location=(5.85, 4.65, 1.82))
    cam = bpy.context.object
    cam.name = '客廳室內透視樣板鏡頭'
    cam.data.type = 'PERSP'
    cam.data.lens = 35
    cam.data.sensor_width = 36
    look_at(cam, (3.25, 2.22, 0.72))
    bpy.context.scene.camera = cam

    # Room-scale soft lighting for a warmer interior-design presentation.
    for obj in list(bpy.data.objects):
        if obj.type == 'LIGHT':
            obj.hide_render = True
    bpy.ops.object.light_add(type='AREA', location=(3.5, 1.0, 4.8))
    key = bpy.context.object
    key.name = '客廳窗側柔光'
    key.data.energy = 360
    key.data.shape = 'RECTANGLE'
    key.data.size = 2.8
    key.data.size_y = 2.2
    key.data.color = (1.0, 0.82, 0.68)
    look_at(key, (3.7, 2.1, 0.7))
    bpy.ops.object.light_add(type='AREA', location=(5.4, 3.9, 3.4))
    fill = bpy.context.object
    fill.name = '客廳電視牆補光'
    fill.data.energy = 180
    fill.data.shape = 'DISK'
    fill.data.size = 2.2
    fill.data.color = (0.75, 0.82, 1.0)
    look_at(fill, (5.3, 2.4, 1.0))
    bpy.ops.object.light_add(type='AREA', location=(4.6, 2.3, 5.5))
    top = bpy.context.object
    top.name = '客廳頂部柔光'
    top.data.energy = 220
    top.data.size = 3.0
    top.data.color = (1.0, 0.93, 0.84)
    look_at(top, (4.4, 2.2, 0.0))

    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = os.path.join(OUT, 'B8-2F_客廳_高品質渲染_v0.1.png')
    scene.world.color = (0.025, 0.020, 0.016)
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = -0.45
    scene['hero_view'] = 'living-room perspective sample'
    scene['hero_note'] = '第一版高品質客廳樣板；家具曲面、布料與暖木配色供逐項確認'
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'B8-2F_客廳_高品質渲染_v0.1.blend'))
    bpy.ops.render.render(write_still=True)


main()

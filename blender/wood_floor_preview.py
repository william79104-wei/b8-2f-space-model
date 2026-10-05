import bpy
import math
import os
from mathutils import Vector

OUT_DIR = r"C:\Users\USER\Documents\Codex\2026-09-14\referenced-chatgpt-conversation-this-is-an\outputs"
os.makedirs(OUT_DIR, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            datablocks.remove(block)


def material_principled(name, color, roughness=0.7):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF') or mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def make_k635_material(variant=0):
    mat = bpy.data.materials.new(f'Euro Home 優境 K635 灰棕木地板 {variant + 1}')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out = nodes.new('ShaderNodeOutputMaterial')
    out.location = (620, 0)
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (360, 0)
    bsdf.inputs['Roughness'].default_value = 0.62
    bsdf.inputs['Specular IOR Level'].default_value = 0.16

    tex = nodes.new('ShaderNodeTexCoord')
    tex.location = (-720, 0)
    mapping = nodes.new('ShaderNodeMapping')
    mapping.location = (-540, 0)
    mapping.inputs['Scale'].default_value = (3.0, 28.0, 3.0)

    noise = nodes.new('ShaderNodeTexNoise')
    noise.location = (-320, 120)
    noise.inputs['Scale'].default_value = 3.8
    noise.inputs['Detail'].default_value = 6.0
    noise.inputs['Roughness'].default_value = 0.72

    wave = nodes.new('ShaderNodeTexWave')
    wave.location = (-320, -120)
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'X'
    wave.inputs['Scale'].default_value = 7.0
    wave.inputs['Distortion'].default_value = 8.0
    wave.inputs['Detail'].default_value = 4.0
    wave.inputs['Detail Scale'].default_value = 2.0

    mix = nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'MULTIPLY'
    mix.inputs[0].default_value = 0.32
    mix.location = (-80, 80)

    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.location = (120, 80)
    ramp.color_ramp.elements[0].position = 0.16
    darks = [(0.035, 0.026, 0.022), (0.038, 0.028, 0.023), (0.033, 0.025, 0.022), (0.041, 0.029, 0.024)]
    mids = [(0.09, 0.065, 0.055), (0.096, 0.069, 0.057), (0.085, 0.063, 0.054), (0.102, 0.071, 0.058)]
    lights = [(0.20, 0.145, 0.12), (0.21, 0.151, 0.124), (0.19, 0.14, 0.117), (0.22, 0.156, 0.127)]
    ramp.color_ramp.elements[0].color = (*darks[variant], 1.0)
    ramp.color_ramp.elements[1].position = 0.84
    ramp.color_ramp.elements[1].color = (*lights[variant], 1.0)
    ramp.color_ramp.elements.new(0.52).color = (*mids[variant], 1.0)

    bump = nodes.new('ShaderNodeBump')
    bump.location = (160, -120)
    bump.inputs['Strength'].default_value = 0.32
    bump.inputs['Distance'].default_value = 0.045

    fine_mapping = nodes.new('ShaderNodeMapping')
    fine_mapping.location = (-540, -300)
    fine_mapping.inputs['Scale'].default_value = (1.2, 42.0, 2.0)
    fine_noise = nodes.new('ShaderNodeTexNoise')
    fine_noise.location = (-320, -300)
    fine_noise.inputs['Scale'].default_value = 4.5
    fine_noise.inputs['Detail'].default_value = 3.0
    fine_noise.inputs['Roughness'].default_value = 0.8
    rough_noise = nodes.new('ShaderNodeTexNoise')
    rough_noise.location = (-300, -470)
    rough_noise.inputs['Scale'].default_value = 7.0
    rough_noise.inputs['Detail'].default_value = 2.0
    rough_ramp = nodes.new('ShaderNodeValToRGB')
    rough_ramp.location = (80, -350)
    rough_ramp.color_ramp.elements[0].position = 0.25
    rough_ramp.color_ramp.elements[0].color = (0.42, 0.42, 0.42, 1.0)
    rough_ramp.color_ramp.elements[1].position = 0.75
    rough_ramp.color_ramp.elements[1].color = (0.72, 0.72, 0.72, 1.0)

    links.new(tex.outputs['Generated'], mapping.inputs['Vector'])
    links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    links.new(mapping.outputs['Vector'], wave.inputs['Vector'])
    links.new(tex.outputs['Generated'], fine_mapping.inputs['Vector'])
    links.new(fine_mapping.outputs['Vector'], fine_noise.inputs['Vector'])
    links.new(fine_mapping.outputs['Vector'], rough_noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], mix.inputs[1])
    links.new(wave.outputs['Color'], mix.inputs[2])
    links.new(mix.outputs['Color'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(fine_noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    links.new(rough_noise.outputs['Fac'], rough_ramp.inputs['Fac'])
    links.new(rough_ramp.outputs['Color'], bsdf.inputs['Roughness'])
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


def add_box(name, location, scale, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new('微倒角', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


clear_scene()
wood_mats = [make_k635_material(i) for i in range(4)]
wall_mat = material_principled('暖白牆面', (0.72, 0.70, 0.65), 0.82)
trim_mat = material_principled('深色踢腳', (0.12, 0.09, 0.075), 0.58)

# A small straight-lay sample room, using the chosen K635 grey-brown tone.
room_w, room_d = 4.8, 3.6
# The supplied installed-floor reference reads as wide, long laminate boards
# with staggered end joints rather than narrow strip flooring.
plank_l, plank_w, gap, thick = 1.80, 0.22, 0.004, 0.018
rows = math.ceil(room_d / (plank_w + gap))
for row in range(rows):
    y = -room_d / 2 + plank_w / 2 + row * (plank_w + gap)
    offsets = (0.0, 0.62, 0.22, 0.96)
    offset = offsets[row % len(offsets)]
    cols = math.ceil((room_w + plank_l) / plank_l) + 1
    for col in range(-1, cols):
        x = -room_w / 2 + offset + col * plank_l + plank_l / 2
        mat = wood_mats[(row * 7 + col * 11) % len(wood_mats)]
        add_box(f'K635_plank_{row}_{col}', (x, y, thick / 2), (plank_l / 2 - gap / 2, plank_w / 2 - gap / 2, thick / 2), mat, 0.0025)

# Simple wall and baseboard for scale and reflected light.
add_box('back_wall', (0, room_d / 2 + 0.06, 1.25), (room_w / 2, 0.06, 1.25), wall_mat, 0.01)
add_box('left_wall', (-room_w / 2 - 0.06, 0, 1.25), (0.06, room_d / 2, 1.25), wall_mat, 0.01)
add_box('back_baseboard', (0, room_d / 2 - 0.01, 0.09), (room_w / 2, 0.025, 0.09), trim_mat, 0.006)
add_box('left_baseboard', (-room_w / 2 + 0.01, 0, 0.09), (0.025, room_d / 2, 0.09), trim_mat, 0.006)

# Camera and soft studio lighting.
bpy.ops.object.camera_add(location=(4.25, -4.7, 3.0))
camera = bpy.context.object
camera.data.lens = 48
look_at(camera, (0.0, 0.35, 0.15))
bpy.context.scene.camera = camera

def add_area(name, location, energy, size, color):
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    light.data.color = color
    look_at(light, (0, 0, 0))

add_area('大面積柔光', (-1.8, -1.0, 4.5), 700, 4.0, (1.0, 0.91, 0.82))
add_area('側向補光', (3.0, 1.2, 2.6), 450, 2.2, (0.82, 0.88, 1.0))

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 900
scene.render.resolution_y = 650
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.render.filepath = os.path.join(OUT_DIR, 'B8-2F_K635_木地板預覽.png')
scene.world.color = (0.035, 0.03, 0.026)
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.look = 'AgX - Medium High Contrast'

scene['material_reference'] = 'Euro Home 優境 K635，依使用者提供右側樣板近似'
scene['plank_layout'] = '直鋪，交錯錯縫'
scene['note'] = 'Preview only; final plank direction, batch colour, gloss and skirting require site sample confirmation.'

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT_DIR, 'B8-2F_K635_木地板預覽.blend'))
bpy.ops.render.render(write_still=True)

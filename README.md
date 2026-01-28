# WebGL 3D Animated Chicken Scene

## Project Overview
This project is a WebGL-based 3D graphics application featuring an animated chicken character in a gym environment. It demonstrates advanced computer graphics techniques including hierarchical modeling, texture mapping, and Blinn-Phong shading.

## Technical Implementation

### Features Implemented

1. **Hierarchical Object Modeling**
   - Both chicken wings have 2 levels of articulation
   - The outer layer rotates with greater amplitude than the inner layer
   - Creates realistic wing-flapping animation

2. **Multiple Textures**
   - Implemented procedural checkerboard texture generation
   - Loaded external image textures for various objects
   - Applied textures to cube, sphere, cylinder, and cone primitives
   - Texture toggle functionality for comparison

3. **Advanced Shading**
   - Converted from vertex shader to fragment shader lighting calculations
   - Implemented Blinn-Phong shading model (upgraded from Phong)
   - Per-fragment lighting for improved visual quality

4. **Camera System**
   - 360-degree circular fly-by camera animation
   - Smooth camera movement around the scene
   - Configurable radius and angle parameters

5. **Real-Time Performance**
   - Runs at 165 FPS on high-performance hardware
   - Uses real-time delta calculations for frame-independent animation
   - Performance metrics displayed in console

6. **Frame Rate Display**
   - Real-time FPS counter
   - Console output for performance monitoring

### Scene Components

- **Animated Chicken**: Main character with hierarchical wing animation
- **Gym Equipment**: Bench press with weights and barbell
- **KFC Bucket**: Textured cylindrical object with chicken pieces
- **Chicken Coop**: Multi-component structure with roof, legs, and ramp
- **Dynamic Lighting**: Configurable ambient, diffuse, and specular lighting

### Controls

- **Toggle Animation Button**: Start/stop the animation loop
- **Toggle Textures Button**: Switch between textured and solid color rendering

## Technical Specifications

- **Graphics API**: WebGL 2.0
- **Shading Language**: GLSL ES 3.0
- **Primitives**: Cube, Sphere, Cylinder, Cone
- **Lighting Model**: Blinn-Phong shading
- **Texture Mapping**: 2D textures with mipmapping

## Project Structure

- `main.html` - HTML structure and shader definitions
- `main.js` - Main application logic, animation, and rendering
- `objects.js` - 3D geometry definitions and buffer management
- `Common/` - Utility libraries (MV.js, webgl-utils.js, initShaders.js)

## Build Information

This project was developed as part of a computer graphics course, demonstrating understanding of:
- 3D transformation matrices
- Hierarchical scene graphs
- Texture mapping and filtering
- Advanced lighting models
- Real-time animation techniques

## Demo

A video demonstration of the project is included showing:
- Hierarchical animation in action
- Camera movement around the scene
- Texture application and toggling
- Overall scene complexity and quality

---

*Note: This project uses starter code from Lab 5 of the course materials, with significant original implementation for the animation system, hierarchical modeling, and scene design.*

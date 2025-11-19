// components/visuals/Shaders.jsx
import React from 'react';

const Shaders = () => (
    <>
      <script
        type="x-shader/x-vertex"
        id="wrapVertexShader"
        dangerouslySetInnerHTML={{
          __html: `
            attribute float size;
            attribute vec3 customColor;
            varying vec3 vColor;
  
            void main() {
              vColor = customColor;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * (350.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `
        }}
      />
      <script
        type="x-shader/x-fragment"
        id="wrapFragmentShader"
        dangerouslySetInnerHTML={{
          __html: `
            varying vec3 vColor;
            uniform sampler2D pointTexture;
  
            void main() {
              vec4 textureColor = texture2D(pointTexture, gl_PointCoord);
              if (textureColor.a < 0.3) discard;
              gl_FragColor = vec4(vColor, 0.65) * textureColor;
            }
          `
        }}
      />
    </>
  );
  
  

export default Shaders;

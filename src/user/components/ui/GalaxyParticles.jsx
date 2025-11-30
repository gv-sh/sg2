import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TweenMax, TimelineMax, Power0, Power2, Elastic } from 'gsap';
import dotTextureURL from '../ui/img/dotTexture.png';


export default function GalaxyParticles() {
  const canvasRef = useRef();
  const mouse = useRef(new THREE.Vector2(-100, -100));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;

    const colors = [
      new THREE.Color(0xE16740),
      new THREE.Color(0x006EB6),
      new THREE.Color(0xF1B828)
    ];

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.set(0, 0, 350);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 6;

    const galaxy = new THREE.Group();
    scene.add(galaxy);

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "";
    const dotTexture = loader.load(dotTextureURL);

    const dotsAmount = 2000;
    const positions = new Float32Array(dotsAmount * 3);
    const sizes = new Float32Array(dotsAmount);
    const colorsAttribute = new Float32Array(dotsAmount * 3);

    const bufferWrapGeom = new THREE.BufferGeometry();
    const attributePositions = new THREE.BufferAttribute(positions, 3);
    bufferWrapGeom.setAttribute('position', attributePositions);
    const attributeSizes = new THREE.BufferAttribute(sizes, 1);
    bufferWrapGeom.setAttribute('size', attributeSizes);
    const attributeColors = new THREE.BufferAttribute(colorsAttribute, 3);
    bufferWrapGeom.setAttribute('customColor', attributeColors);

    const dotsVertices = [];

    function moveDot(vector, index) {
      const tempVector = vector.clone();
      tempVector.multiplyScalar((Math.random() - 0.5) * 2 + 1);
      TweenMax.to(vector, Math.random() * 3 + 10, {
        x: tempVector.x,
        y: tempVector.y,
        z: tempVector.z,
        yoyo: true,
        repeat: -1,
        delay: -Math.random() * 5,
        ease: Power0.easeNone,
        onUpdate: () => {
          attributePositions.array[index * 3] = vector.x;
          attributePositions.array[index * 3 + 1] = vector.y;
          attributePositions.array[index * 3 + 2] = vector.z;
        }
      });
    }

    for (let i = 0; i < dotsAmount; i++) {
      const vector = new THREE.Vector3();
      vector.color = Math.floor(Math.random() * colors.length);
      vector.theta = Math.random() * Math.PI * 2;
      vector.phi = (1 - Math.sqrt(Math.random())) * Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1);

      vector.x = Math.cos(vector.theta) * Math.cos(vector.phi);
      vector.y = Math.sin(vector.phi);
      vector.z = Math.sin(vector.theta) * Math.cos(vector.phi);
      vector.multiplyScalar(120 + (Math.random() - 0.5) * 5);
      vector.scaleX = 5;

      if (Math.random() > 0.5) moveDot(vector, i);

      dotsVertices.push(vector);
      vector.toArray(positions, i * 3);
      colors[vector.color].toArray(colorsAttribute, i * 3);
      sizes[i] = 5;
    }

    const vertexShaderElement = document.getElementById("wrapVertexShader");
    const fragmentShaderElement = document.getElementById("wrapFragmentShader");
    if (!vertexShaderElement || !fragmentShaderElement) return;

    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: { pointTexture: { value: dotTexture } },
      vertexShader: vertexShaderElement.textContent,
      fragmentShader: fragmentShaderElement.textContent,
      transparent: true
    });

    const wrap = new THREE.Points(bufferWrapGeom, shaderMaterial);
    scene.add(wrap);

    const segmentsGeom = new THREE.BufferGeometry();
    const segmentPositions = [];
    const segmentColors = [];

    for (let i = dotsVertices.length - 1; i >= 0; i--) {
      const vector = dotsVertices[i];
      for (let j = dotsVertices.length - 1; j >= 0; j--) {
        if (i !== j && vector.distanceTo(dotsVertices[j]) < 12) {
          segmentPositions.push(vector.x, vector.y, vector.z);
          segmentPositions.push(dotsVertices[j].x, dotsVertices[j].y, dotsVertices[j].z);
    
          const color = colors[vector.color];
          segmentColors.push(color.r, color.g, color.b);
          segmentColors.push(color.r, color.g, color.b);
        }
      }
    }

    segmentsGeom.setAttribute('position', new THREE.Float32BufferAttribute(segmentPositions, 3));
    segmentsGeom.setAttribute('color', new THREE.Float32BufferAttribute(segmentColors, 3));

    const segmentsMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      vertexColors: true
    });

    const segments = new THREE.LineSegments(segmentsGeom, segmentsMat);
    galaxy.add(segments);

    let hovered = [];
    let prevHovered = [];

    function render() {
      raycaster.setFromCamera(mouse.current, camera);
      const intersections = raycaster.intersectObjects([wrap]);

      hovered = [];
      intersections.forEach(({ index }) => {
        hovered.push(index);
        if (!prevHovered.includes(index)) onDotHover(index);
      });

      prevHovered.forEach((index) => {
        if (!hovered.includes(index)) mouseOut(index);
      });

      prevHovered = [...hovered];
      attributeSizes.needsUpdate = true;
      attributePositions.needsUpdate = true;

      renderer.render(scene, camera);
    }

    let animationFrameId;
    function animate() {
      render();
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();

    function onDotHover(index) {
      const vector = dotsVertices[index];
      vector.tl = new TimelineMax();
      vector.tl.to(vector, 1, {
        scaleX: 15,
        ease: Elastic.easeOut.config(2, 0.2),
        onUpdate: () => { attributeSizes.array[index] = vector.scaleX; }
      });
    }

    function mouseOut(index) {
      const vector = dotsVertices[index];
      vector.tl.to(vector, 0.4, {
        scaleX: 5,
        ease: Power2.easeOut,
        onUpdate: () => { attributeSizes.array[index] = vector.scaleX; }
      });
    }

    function onResize() {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

    }

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / height) * 2 + 1;
    }

    window.addEventListener("mousemove", onMouseMove);
    let resizeTm;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTm);
      resizeTm = setTimeout(onResize, 200);
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

"use client";

import { useEffect, useRef, useState } from "react";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  // Scroll Spy for Navigation
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section[id]");
      let currentSection = "";

      sections.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top;
        if (sectionTop <= window.innerHeight / 2) {
          currentSection = section.getAttribute("id") || "";
        }
      });

      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Custom Cursor Logic
  useGSAP(() => {
    if (window.matchMedia("(hover: none)").matches) return; // Skip on touch devices

    const xTo = gsap.quickTo(cursorRef.current, "x", { duration: 0.3, ease: "power3" });
    const yTo = gsap.quickTo(cursorRef.current, "y", { duration: 0.3, ease: "power3" });

    const moveCursor = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };
    window.addEventListener("mousemove", moveCursor);

    // Scale on interactive elements
    const interactives = document.querySelectorAll('a, button, .cursor-pointer');
    const scaleUp = () => gsap.to(cursorRef.current, { scale: 3, opacity: 0.5, duration: 0.3 });
    const scaleDown = () => gsap.to(cursorRef.current, { scale: 1, opacity: 1, duration: 0.3 });

    interactives.forEach((el) => {
      el.addEventListener('mouseenter', scaleUp);
      el.addEventListener('mouseleave', scaleDown);
    });

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      interactives.forEach((el) => {
        el.removeEventListener('mouseenter', scaleUp);
        el.removeEventListener('mouseleave', scaleDown);
      });
    };
  }, { scope: containerRef });

  // WebGL Shader Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(syncSize).observe(canvas);
    }
    syncSize();

    const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext);
    if (!gl) return;
    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 a0 = x - floor(x + 0.5);
  vec3 g = a0 * vec3(x0.x,x12.xz) + h * vec3(x0.y,x12.yw);
  vec3 l = 1.79284291400159 - 0.85373472095314 * ( g*g + h*h );
  vec3  v1 = vec3(0.0);
  v1.x = g.x * l.x;
  v1.y = g.y * l.y;
  v1.z = g.z * l.z;
  return 130.0 * dot(m, v1);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float n1 = snoise(uv * 1.5 + u_time * 0.1);
    float n2 = snoise(uv * 2.0 - u_time * 0.15 + 10.0);
    vec3 purple = vec3(0.482, 0.184, 0.969);
    vec3 pink = vec3(1.0, 0.18, 0.576);
    vec3 cyan = vec3(0.0, 0.878, 1.0);
    vec3 yellow = vec3(0.957, 1.0, 0.224);
    float blob1 = smoothstep(0.1, 0.8, n1);
    vec3 color1 = mix(purple, pink, uv.x);
    float blob2 = smoothstep(0.1, 0.8, n2);
    vec3 color2 = mix(cyan, yellow, uv.y);
    vec3 finalColor = mix(vec3(1.0), color1, blob1 * 0.3);
    finalColor = mix(finalColor, color2, blob2 * 0.3);
    gl_FragColor = vec4(finalColor, 1.0);
}`;
    function cs(type: number, src: string) {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    const prog = gl.createProgram();
    if (!prog) return;
    const vShader = cs(gl.VERTEX_SHADER, vs);
    const fShader = cs(gl.FRAGMENT_SHADER, fs);
    if (vShader) gl.attachShader(prog, vShader);
    if (fShader) gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    const mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    let animationFrameId: number;
    function render(t: number) {
      if (!gl) return;
      if (typeof ResizeObserver === 'undefined') syncSize();
      gl.viewport(0, 0, canvas!.width, canvas!.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas!.width, canvas!.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }
    render(0);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // GSAP Animations (Scroll Reveal, Parallax, Pins, Stats, Magnet)
  useGSAP(() => {
    // Only animate if prefers-reduced-motion is false
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // 1. Reveal sections
    const sections = gsap.utils.toArray('.reveal-section') as HTMLElement[];
    sections.forEach((section) => {
      const revealElements = section.querySelectorAll('.reveal-item');
      if (revealElements.length === 0) return;
      gsap.from(revealElements, {
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
        },
        y: 50,
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: "back.out(1.2)",
      });
    });

    // 2. Parallax blobs
    const blobs = gsap.utils.toArray('.float-blob') as HTMLElement[];
    blobs.forEach((blob) => {
      gsap.to(blob, {
        scrollTrigger: {
          trigger: blob.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
        y: (i, el) => -parseFloat(el.getAttribute('data-speed') || '1') * 200,
        ease: "none",
      });
    });

    // 3. Hero Exit Pin & Scale
    const heroContent = document.querySelector('.hero-content');
    gsap.to(heroContent, {
      scrollTrigger: {
        trigger: '.hero-section',
        start: "top top",
        end: "+=100%",
        pin: true,
        scrub: true,
      },
      scale: 0.9,
      opacity: 0,
      ease: "power2.inOut",
    });

    // 4. Stats Counter
    const statNumbers = gsap.utils.toArray('.stat-num') as HTMLElement[];
    statNumbers.forEach((stat) => {
      const targetVal = parseFloat(stat.innerText.replace(/[^0-9.]/g, ''));
      const prefix = stat.innerText.replace(/[0-9.]/g, '');
      const suffixMatch = stat.innerText.match(/[^0-9.]*$/);
      const suffix = suffixMatch ? suffixMatch[0] : '';

      let obj = { val: 0 };
      gsap.to(obj, {
        scrollTrigger: {
          trigger: stat,
          start: "top 90%",
        },
        val: targetVal,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => {
          // Check if there was a % or + sign
          if (stat.innerText.includes('%')) {
            stat.innerText = Math.floor(obj.val) + "%";
          } else if (stat.innerText.includes('+')) {
            stat.innerText = Math.floor(obj.val) + "+";
          } else {
            // default zero-padding for 01, 03
            stat.innerText = Math.floor(obj.val).toString().padStart(2, '0');
          }
        }
      });
    });

    // 5. Magnetic Button Effect
    const magneticBtns = gsap.utils.toArray('.magnetic-btn') as HTMLElement[];
    magneticBtns.forEach((btn) => {
      const xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3.out" });
      const yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3.out" });

      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);

        // Only trigger within ~40px of center (so it doesn't move too wildly)
        xTo(relX * 0.2); // max 8-12px offset
        yTo(relY * 0.2);
      });

      btn.addEventListener("mouseleave", () => {
        xTo(0);
        yTo(0);
      });
    });

  }, { scope: containerRef });

  return (
    <div ref={containerRef}>
      {/* Custom Cursor */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-4 h-4 bg-secondary rounded-full pointer-events-none z-[9999]"
        style={{ transform: 'translate(-50%, -50%)', display: 'none' }}
      ></div>

      {/* Global Nav Shell */}
      <header className="fixed top-0 left-0 w-full bg-surface border-primary" style={{ zIndex: 100, borderBottomWidth: '2px', backgroundColor: 'rgba(253, 248, 248, 0.8)', backdropFilter: 'blur(12px)' }}>
        <nav className="flex justify-between items-center px-margin-safe py-4 max-w-full">
          {/* Left: Logo */}
          <div className="flex-1">
            <span className="text-display-lg-mobile font-black text-primary tracking-tighter uppercase cursor-pointer" style={{ fontSize: '24px' }}>SPIDY</span>
          </div>

          {/* Center: Desktop/Tablet Nav Links */}
          <div className="hidden md:flex flex-1 justify-center gap-6 items-center">
            <a className={`nav-link ${activeSection === 'work' ? 'active' : ''}`} href="#work">WORK</a>
            <a className={`nav-link ${activeSection === 'about' ? 'active' : ''}`} href="#about">ABOUT</a>
            <a className={`nav-link ${activeSection === 'skills' ? 'active' : ''}`} href="#skills">SKILLS</a>
            <a className={`nav-link ${activeSection === 'experience' ? 'active' : ''}`} href="#experience">EXPERIENCE</a>
            <a className={`nav-link ${activeSection === 'certifications' ? 'active' : ''}`} href="#certifications">CERTIFICATES</a>
            <a className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`} href="#contact">CONTACT</a>
          </div>

          {/* Right: Resume Button (Desktop) & Hamburger (Mobile) */}
          <div className="flex-1 flex justify-end items-center">
            <a
              href="https://docs.google.com/document/d/111tYTWgQolZ7Rf_qR5OsMNgpVdFGrXl3/edit?usp=sharing&ouid=110326571118112098268&rtpof=true&sd=true"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:block btn-primary magnetic-btn cursor-pointer text-center"
              style={{ textDecoration: 'none' }}
            >
              RESUME
            </a>
            <button
              className="md:hidden text-primary relative p-2"
              style={{ zIndex: 101 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-surface flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        style={{ zIndex: 99, backdropFilter: 'blur(16px)', backgroundColor: 'rgba(253, 248, 248, 0.95)' }}
      >
        <div className="flex flex-col gap-6 text-center">
          <a className={`nav-link text-3xl font-bold ${activeSection === 'work' ? 'active' : ''}`} href="#work" onClick={() => setIsMobileMenuOpen(false)}>WORK</a>
          <a className={`nav-link text-3xl font-bold ${activeSection === 'about' ? 'active' : ''}`} href="#about" onClick={() => setIsMobileMenuOpen(false)}>ABOUT</a>
          <a className={`nav-link text-3xl font-bold ${activeSection === 'skills' ? 'active' : ''}`} href="#skills" onClick={() => setIsMobileMenuOpen(false)}>SKILLS</a>
          <a className={`nav-link text-3xl font-bold ${activeSection === 'experience' ? 'active' : ''}`} href="#experience" onClick={() => setIsMobileMenuOpen(false)}>EXPERIENCE</a>
          <a className={`nav-link text-3xl font-bold ${activeSection === 'certifications' ? 'active' : ''}`} href="#certifications" onClick={() => setIsMobileMenuOpen(false)}>CERTIFICATES</a>
          <a className={`nav-link text-3xl font-bold ${activeSection === 'contact' ? 'active' : ''}`} href="#contact" onClick={() => setIsMobileMenuOpen(false)}>CONTACT</a>
          <a
            href="https://docs.google.com/document/d/111tYTWgQolZ7Rf_qR5OsMNgpVdFGrXl3/edit?usp=sharing&ouid=110326571118112098268&rtpof=true&sd=true"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-8 text-center"
            style={{ fontSize: '18px', padding: '1rem 2rem', textDecoration: 'none' }}
          >
            RESUME
          </a>
        </div>
      </div>

      {/* Shader Background Container */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-40">
        <div className="w-full h-full" style={{ display: 'block' }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }}></canvas>
        </div>
      </div>

      <main>
        {/* Hero Section */}
        <section className="hero-section min-h-screen flex flex-col justify-center px-margin-safe relative overflow-hidden" style={{ paddingTop: '6rem' }}>
          <div className="hero-content z-10" style={{ willChange: 'transform, opacity' }}>
            <h1 className="text-display-lg-mobile md:text-display-2xl tilted-left origin-left">
              RAHUMAN T
            </h1>
            <div className="flex flex-col md:flex-row md:items-end gap-4" style={{ marginTop: '-40px' }}>
              <h2 className="text-display-lg-mobile md:text-display-lg tilted-right origin-left inline-block">
                AI/ML <span className="duo-tone-text" data-text="ENGINEER">ENGINEER</span>
              </h2>
            </div>
            <div className="flex gap-6" style={{ marginTop: '3rem' }}>
              <button className="bg-secondary text-on-secondary px-10 py-5 rounded-full text-headline-md font-bold hard-shadow-primary magnetic-btn cursor-pointer" style={{ fontSize: '20px' }}>
                Let's Talk
              </button>
              <div className="flex flex-col justify-center">
                <span className="text-code-sm uppercase tracking-tighter opacity-60">Located in</span>
                <span className="font-bold uppercase tracking-widest text-code-sm">Tiruppur, India</span>
              </div>
            </div>
          </div>
          {/* Background Blobs (Parallax) */}
          <div className="absolute top-1/4 right-0 bg-secondary float-blob rounded-full" data-speed="1.5" style={{ width: '24rem', height: '24rem', willChange: 'transform' }}></div>
          <div className="absolute bottom-1/4 left-0 bg-tertiary-fixed float-blob rounded-full" data-speed="2" style={{ width: '31.25rem', height: '31.25rem', left: '-100px', animationDelay: '-5s', willChange: 'transform' }}></div>
        </section>

        {/* About Section */}
        <section className="reveal-section py-32 px-margin-safe bg-primary text-on-primary relative" id="about">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 items-center">
            <div className="w-full md:w-1/2">
              <div className="reveal-item relative inline-block bg-tertiary-fixed text-primary px-4 py-2 text-code-sm font-black tilted-right hard-shadow-secondary" style={{ marginBottom: '2rem' }}>
                B.TECH · AI & DATA SCIENCE
              </div>
              <p className="reveal-item text-display-lg-mobile md:text-headline-md tilted-left" style={{ lineHeight: 1.1 }}>
                "I don't just build models. I build <span className="chromatic-text" style={{ color: '#ff00ff', textShadow: '2px 2px 0px #00ff00' }}>real products</span> that solve complex human problems with surgical precision."
              </p>
            </div>
            <div className="reveal-item w-full md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md aspect-square bg-surface border-4 border-white tilted-right hard-shadow-error overflow-hidden group">
                <img className="w-full h-full object-cover transition-all" style={{ filter: 'grayscale(100%)' }} onMouseOver={e => e.currentTarget.style.filter = 'none'} onMouseOut={e => e.currentTarget.style.filter = 'grayscale(100%)'} alt="Professional portrait" src="/rahuman-photo.png" />
                <div className="absolute inset-0" style={{ backgroundColor: 'rgba(106, 9, 230, 0.2)', mixBlendMode: 'multiply', pointerEvents: 'none' }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="reveal-section py-20 px-margin-safe grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="reveal-item flex flex-col items-center">
            <span className="stat-num text-display-lg text-secondary -rotate-6">12+</span>
            <span className="text-code-sm uppercase font-bold tracking-widest text-on-surface-variant">Projects Done</span>
          </div>
          <div className="reveal-item flex flex-col items-center">
            <span className="stat-num text-display-lg text-error rotate-3">02</span>
            <span className="text-code-sm uppercase font-bold tracking-widest text-on-surface-variant">Internships</span>
          </div>
          <div className="reveal-item flex flex-col items-center">
            <span className="stat-num text-display-lg text-tertiary-fixed -rotate-2">95%</span>
            <span className="text-code-sm uppercase font-bold tracking-widest text-on-surface-variant">Accuracy Rate</span>
          </div>
          <div className="reveal-item flex flex-col items-center">
            <span className="stat-num text-display-lg rotate-6" style={{ color: '#838a00' }}>0</span>
            <span className="text-code-sm uppercase font-bold tracking-widest text-on-surface-variant">Gold Medal</span>
          </div>
        </section>

        {/* Skills Section */}
        <section className="reveal-section py-32 px-margin-safe overflow-hidden relative" id="skills">
          <h3 className="reveal-item absolute inset-0 flex items-center justify-center text-display-2xl opacity-10 select-none pointer-events-none -z-10 -rotate-12">
            SKILLS
          </h3>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10" style={{ marginTop: '2rem' }}>

            <div className="reveal-item">
              <h4 className="text-code-sm font-bold text-secondary uppercase tracking-widest" style={{ marginBottom: '1rem', display: 'block' }}>// Languages</h4>
              <div className="flex flex-wrap gap-4">
                <div className="bg-primary text-on-primary px-8 py-4 font-bold text-lg tilted-left hard-shadow-secondary hover:rotate-0 transition-transform cursor-pointer">Python</div>
                <div className="bg-secondary text-on-secondary px-8 py-4 font-bold text-lg tilted-right hard-shadow-primary hover:rotate-0 transition-transform cursor-pointer">SQL</div>
                <div className="bg-white border-2 border-primary text-primary px-8 py-4 font-bold text-lg tilted-left hard-shadow-error hover:rotate-0 transition-transform cursor-pointer">JavaScript</div>
              </div>
            </div>

            <div className="reveal-item">
              <h4 className="text-code-sm font-bold text-secondary uppercase tracking-widest" style={{ marginBottom: '1rem', display: 'block' }}>// ML & Deep Learning</h4>
              <div className="flex flex-wrap gap-4">
                <div className="bg-error text-white px-8 py-4 font-bold text-lg tilted-right hard-shadow-secondary hover:rotate-0 transition-transform cursor-pointer">Machine Learning</div>
                <div className="bg-tertiary-fixed text-primary px-8 py-4 font-bold text-lg tilted-left hard-shadow-primary hover:rotate-0 transition-transform cursor-pointer">Deep Learning (PyTorch/TensorFlow - Basics)</div>
                <div className="bg-primary text-on-primary px-8 py-4 font-bold text-lg tilted-right hard-shadow-error hover:rotate-0 transition-transform cursor-pointer">Model Evaluation</div>
                <div className="bg-white border-2 border-primary text-primary px-8 py-4 font-bold text-lg tilted-left hard-shadow-tertiary hover:rotate-0 transition-transform cursor-pointer">Statistics</div>
              </div>
            </div>

            <div className="reveal-item">
              <h4 className="text-code-sm font-bold text-secondary uppercase tracking-widest" style={{ marginBottom: '1rem', display: 'block' }}>// GenAI & NLP</h4>
              <div className="flex flex-wrap gap-4">
                <div className="bg-secondary text-white px-8 py-4 font-bold text-lg tilted-left hard-shadow-error hover:rotate-0 transition-transform cursor-pointer">Prompt Engineering</div>
                <div className="bg-primary text-white px-8 py-4 font-bold text-lg tilted-right hard-shadow-tertiary hover:rotate-0 transition-transform cursor-pointer">LangChain (Basics)</div>
                <div className="bg-error text-white px-8 py-4 font-bold text-lg tilted-left hard-shadow-primary hover:rotate-0 transition-transform cursor-pointer">OpenAI API</div>
                <div className="bg-white border-2 border-primary text-primary px-8 py-4 font-bold text-lg tilted-right hard-shadow-secondary hover:rotate-0 transition-transform cursor-pointer">NLP (Basics)</div>
              </div>
            </div>

            <div className="reveal-item">
              <h4 className="text-code-sm font-bold text-secondary uppercase tracking-widest" style={{ marginBottom: '1rem', display: 'block' }}>// Data & Visualization</h4>
              <div className="flex flex-wrap gap-4">
                <div className="bg-tertiary-fixed text-primary px-8 py-4 font-bold text-lg tilted-right hard-shadow-error hover:rotate-0 transition-transform cursor-pointer">Pandas</div>
                <div className="bg-primary text-white px-8 py-4 font-bold text-lg tilted-left hard-shadow-secondary hover:rotate-0 transition-transform cursor-pointer">NumPy</div>
                <div className="bg-white border-2 border-primary text-primary px-8 py-4 font-bold text-lg tilted-right hard-shadow-primary hover:rotate-0 transition-transform cursor-pointer">Matplotlib</div>
                <div className="bg-secondary text-white px-8 py-4 font-bold text-lg tilted-left hard-shadow-tertiary hover:rotate-0 transition-transform cursor-pointer">Seaborn</div>
                <div className="bg-error text-white px-8 py-4 font-bold text-lg tilted-right hard-shadow-primary hover:rotate-0 transition-transform cursor-pointer">EDA</div>
                <div className="bg-primary text-white px-8 py-4 font-bold text-lg tilted-left hard-shadow-error hover:rotate-0 transition-transform cursor-pointer">Data Cleaning</div>
                <div className="bg-white border-2 border-primary text-primary px-8 py-4 font-bold text-lg tilted-right hard-shadow-secondary hover:rotate-0 transition-transform cursor-pointer">Data Visualization</div>
              </div>
            </div>

            <div className="reveal-item">
              <h4 className="text-code-sm font-bold text-secondary uppercase tracking-widest" style={{ marginBottom: '1rem', display: 'block' }}>// Frameworks & Deployment</h4>
              <div className="flex flex-wrap gap-4">
                <div className="bg-primary text-white px-8 py-4 font-bold text-lg tilted-left hard-shadow-tertiary hover:rotate-0 transition-transform cursor-pointer">Flask</div>
                <div className="bg-white border-2 border-primary text-primary px-8 py-4 font-bold text-lg tilted-right hard-shadow-secondary hover:rotate-0 transition-transform cursor-pointer">FastAPI</div>
                <div className="bg-secondary text-white px-8 py-4 font-bold text-lg tilted-left hard-shadow-primary hover:rotate-0 transition-transform cursor-pointer">Django</div>
                <div className="bg-error text-white px-8 py-4 font-bold text-lg tilted-right hard-shadow-error hover:rotate-0 transition-transform cursor-pointer">Docker (Basics)</div>
                <div className="bg-tertiary-fixed text-primary px-8 py-4 font-bold text-lg tilted-left hard-shadow-secondary hover:rotate-0 transition-transform cursor-pointer">Streamlit (Basics)</div>
              </div>
            </div>

            <div className="reveal-item">
              <h4 className="text-code-sm font-bold text-secondary uppercase tracking-widest" style={{ marginBottom: '1rem', display: 'block' }}>// Databases & Tools</h4>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white border-2 border-primary text-primary px-8 py-4 font-bold text-lg tilted-right hard-shadow-error hover:rotate-0 transition-transform cursor-pointer">MySQL</div>
                <div className="bg-primary text-white px-8 py-4 font-bold text-lg tilted-left hard-shadow-primary hover:rotate-0 transition-transform cursor-pointer">MongoDB (Basics)</div>
                <div className="bg-secondary text-white px-8 py-4 font-bold text-lg tilted-right hard-shadow-tertiary hover:rotate-0 transition-transform cursor-pointer">Firebase (Basics)</div>
                <div className="bg-error text-white px-8 py-4 font-bold text-lg tilted-left hard-shadow-secondary hover:rotate-0 transition-transform cursor-pointer">Git</div>
                <div className="bg-primary text-white px-8 py-4 font-bold text-lg tilted-right hard-shadow-error hover:rotate-0 transition-transform cursor-pointer">GitHub</div>
                <div className="bg-tertiary-fixed text-primary px-8 py-4 font-bold text-lg tilted-left hard-shadow-primary hover:rotate-0 transition-transform cursor-pointer">Google Colab</div>
                <div className="bg-white border-2 border-primary text-primary px-8 py-4 font-bold text-lg tilted-right hard-shadow-tertiary hover:rotate-0 transition-transform cursor-pointer">VS Code</div>
                <div className="bg-secondary text-white px-8 py-4 font-bold text-lg tilted-left hard-shadow-primary hover:rotate-0 transition-transform cursor-pointer">Figma</div>
              </div>
            </div>

          </div>
        </section>

        {/* Featured Projects */}
        <section className="reveal-section py-32 overflow-hidden" id="work" style={{ backgroundColor: '#f7f3f2' }}>
          <div className="px-margin-safe mb-16">
            <h3 className="reveal-item text-display-lg-mobile md:text-display-lg text-primary text-center uppercase tracking-tighter -rotate-1">
              Featured <span className="text-secondary italic">Projects</span>
            </h3>
          </div>

          <div className="w-full relative flex overflow-hidden reveal-item">
            {/* The animated marquee container */}
            <div className="flex animate-marquee" style={{ gap: '4rem', width: 'max-content', paddingLeft: '4rem', paddingRight: '4rem' }}>

              {/* Project 1 */}
              <div className="flex flex-col md:flex-row items-center gap-12" style={{ width: '85vw', maxWidth: '1000px', flexShrink: 0 }}>
                <div className="w-full md:w-1/2" style={{ order: 2 }}>
                  <div className="relative p-2 tilted-left hard-shadow-primary" style={{ background: 'linear-gradient(to bottom right, #22d3ee, #9333ea)' }}>
                    <div className="bg-white p-2">
                      <div className="relative overflow-hidden aspect-video">
                        <img className="w-full h-full object-cover cursor-pointer" alt="AI Job Recommendation System" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHKZ7iEPOVVXpgKQehQjVcR8y4sBJznKFyBZly9ZAvH--Jmw5QUgUBCcSZKhQkkwJcgjKETu38pLNa-xPdobG45h6tzFXDxO6J58AvcU9C1NMrbZ3qFFGNe2mxct0MJinaxR4Zz4Abaeoiqu4PnXVmyTA_-_KPE6AtlZUg9GeOdlxVvggepxrY5Gx5i554fXDn49cVJJ-iljgwMdEwOPDtZ1xKUCob3TO0PoeJdYMKJAJv7lpWJsSW5LtzqnxRcEo80CG4W20mb5gs" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-1/2" style={{ order: 1 }}>
                  <span className="text-code-sm text-secondary font-bold tracking-widest uppercase block" style={{ marginBottom: '1rem' }}>// PROJECT 01</span>
                  <h4 className="text-display-lg-mobile md:text-headline-md leading-tight" style={{ marginBottom: '1.5rem' }}>
                    AI Job <span className="italic" style={{ background: 'linear-gradient(to right, #22d3ee, #facc15)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Recommendation</span> System
                  </h4>
                  <p className="text-body-lg text-on-surface-variant" style={{ marginBottom: '2rem' }}>
                    Engineered a matching engine that processed 50,000+ job descriptions and resumes using BERT embeddings, achieving a 92% placement relevance score.
                  </p>
                  <div className="flex gap-4">
                    <button className="btn-primary font-bold transition-all magnetic-btn" style={{ padding: '0.75rem 2rem' }}>VIEW PROJECT</button>
                    <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer magnetic-btn" style={{ padding: '0.75rem 2rem', backgroundColor: 'transparent' }}>GITHUB</button>
                  </div>
                </div>
              </div>

              {/* Project 2 */}
              <div className="flex flex-col md:flex-row items-center gap-12" style={{ width: '85vw', maxWidth: '1000px', flexShrink: 0 }}>
                <div className="w-full md:w-1/2" style={{ order: 2 }}>
                  <div className="relative p-2 tilted-right hard-shadow-secondary" style={{ background: 'linear-gradient(to bottom right, #facc15, #ef4444)' }}>
                    <div className="bg-white p-2">
                      <div className="relative overflow-hidden aspect-video">
                        <img className="w-full h-full object-cover cursor-pointer" alt="Computer Vision Dashboard" src="https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-1/2" style={{ order: 1 }}>
                  <span className="text-code-sm text-error font-bold tracking-widest uppercase block" style={{ marginBottom: '1rem' }}>// PROJECT 02</span>
                  <h4 className="text-display-lg-mobile md:text-headline-md leading-tight" style={{ marginBottom: '1.5rem' }}>
                    Computer Vision <span className="italic" style={{ background: 'linear-gradient(to right, #facc15, #ef4444)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Dashboard</span>
                  </h4>
                  <p className="text-body-lg text-on-surface-variant" style={{ marginBottom: '2rem' }}>
                    Developed a real-time object detection dashboard utilizing YOLOv8 and React, reducing processing latency by 40% for high-throughput video streams.
                  </p>
                  <div className="flex gap-4">
                    <button className="btn-primary font-bold transition-all magnetic-btn" style={{ padding: '0.75rem 2rem', backgroundColor: 'var(--color-error)' }}>VIEW PROJECT</button>
                    <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer magnetic-btn" style={{ padding: '0.75rem 2rem', backgroundColor: 'transparent' }}>GITHUB</button>
                  </div>
                </div>
              </div>

              {/* DUPLICATE Project 1 */}
              <div className="flex flex-col md:flex-row items-center gap-12" style={{ width: '85vw', maxWidth: '1000px', flexShrink: 0 }}>
                <div className="w-full md:w-1/2" style={{ order: 2 }}>
                  <div className="relative p-2 tilted-left hard-shadow-primary" style={{ background: 'linear-gradient(to bottom right, #22d3ee, #9333ea)' }}>
                    <div className="bg-white p-2">
                      <div className="relative overflow-hidden aspect-video">
                        <img className="w-full h-full object-cover cursor-pointer" alt="AI Job Recommendation System" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHKZ7iEPOVVXpgKQehQjVcR8y4sBJznKFyBZly9ZAvH--Jmw5QUgUBCcSZKhQkkwJcgjKETu38pLNa-xPdobG45h6tzFXDxO6J58AvcU9C1NMrbZ3qFFGNe2mxct0MJinaxR4Zz4Abaeoiqu4PnXVmyTA_-_KPE6AtlZUg9GeOdlxVvggepxrY5Gx5i554fXDn49cVJJ-iljgwMdEwOPDtZ1xKUCob3TO0PoeJdYMKJAJv7lpWJsSW5LtzqnxRcEo80CG4W20mb5gs" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-1/2" style={{ order: 1 }}>
                  <span className="text-code-sm text-secondary font-bold tracking-widest uppercase block" style={{ marginBottom: '1rem' }}>// PROJECT 01</span>
                  <h4 className="text-display-lg-mobile md:text-headline-md leading-tight" style={{ marginBottom: '1.5rem' }}>
                    AI Job <span className="italic" style={{ background: 'linear-gradient(to right, #22d3ee, #facc15)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Recommendation</span> System
                  </h4>
                  <p className="text-body-lg text-on-surface-variant" style={{ marginBottom: '2rem' }}>
                    Engineered a matching engine that processed 50,000+ job descriptions and resumes using BERT embeddings, achieving a 92% placement relevance score.
                  </p>
                  <div className="flex gap-4">
                    <button className="btn-primary font-bold transition-all magnetic-btn" style={{ padding: '0.75rem 2rem' }}>VIEW PROJECT</button>
                    <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer magnetic-btn" style={{ padding: '0.75rem 2rem', backgroundColor: 'transparent' }}>GITHUB</button>
                  </div>
                </div>
              </div>

              {/* DUPLICATE Project 2 */}
              <div className="flex flex-col md:flex-row items-center gap-12" style={{ width: '85vw', maxWidth: '1000px', flexShrink: 0 }}>
                <div className="w-full md:w-1/2" style={{ order: 2 }}>
                  <div className="relative p-2 tilted-right hard-shadow-secondary" style={{ background: 'linear-gradient(to bottom right, #facc15, #ef4444)' }}>
                    <div className="bg-white p-2">
                      <div className="relative overflow-hidden aspect-video">
                        <img className="w-full h-full object-cover cursor-pointer" alt="Computer Vision Dashboard" src="https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-1/2" style={{ order: 1 }}>
                  <span className="text-code-sm text-error font-bold tracking-widest uppercase block" style={{ marginBottom: '1rem' }}>// PROJECT 02</span>
                  <h4 className="text-display-lg-mobile md:text-headline-md leading-tight" style={{ marginBottom: '1.5rem' }}>
                    Computer Vision <span className="italic" style={{ background: 'linear-gradient(to right, #facc15, #ef4444)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Dashboard</span>
                  </h4>
                  <p className="text-body-lg text-on-surface-variant" style={{ marginBottom: '2rem' }}>
                    Developed a real-time object detection dashboard utilizing YOLOv8 and React, reducing processing latency by 40% for high-throughput video streams.
                  </p>
                  <div className="flex gap-4">
                    <button className="btn-primary font-bold transition-all magnetic-btn" style={{ padding: '0.75rem 2rem', backgroundColor: 'var(--color-error)' }}>VIEW PROJECT</button>
                    <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer magnetic-btn" style={{ padding: '0.75rem 2rem', backgroundColor: 'transparent' }}>GITHUB</button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Experience */}
        <section className="reveal-section py-32 px-margin-safe max-w-7xl mx-auto" id="experience">
          <h3 className="reveal-item text-display-lg flex justify-center rotate-1" style={{ marginBottom: '5rem' }}>EXPERIENCE</h3>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-left hard-shadow-secondary relative group">
              <div className="absolute w-20 h-20 bg-tertiary-fixed flex items-center justify-center rotate-12 hard-shadow-primary text-primary" style={{ top: '-1.5rem', right: '-1.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.25rem' }}>bolt</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2023 - PRESENT</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>Iorange Innovation</h5>
              <p className="text-code-sm text-secondary font-bold uppercase" style={{ marginBottom: '1.5rem' }}>AI Developer Intern</p>
              <p className="text-body-lg text-on-surface-variant">
                Pioneered the implementation of real-time object detection models for industrial safety monitoring, reducing incident rates by 15%.
              </p>
            </div>
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-right hard-shadow-error relative mt-12 md:mt-0">
              <div className="absolute w-20 h-20 bg-secondary flex items-center justify-center -rotate-12 hard-shadow-primary text-white" style={{ bottom: '-1.5rem', left: '-1.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.25rem' }}>terminal</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2022 - 2023</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>Career Development Cell</h5>
              <p className="text-code-sm text-error font-bold uppercase" style={{ marginBottom: '1.5rem' }}>Technical Lead</p>
              <p className="text-body-lg text-on-surface-variant">
                Architected an automated portal for student tracking and placement management, streamlining the workflow for 2000+ students.
              </p>
            </div>
          </div>
        </section>

        {/* Premium Certifications Section (Matching Experience Visual Language) */}
        <section className="reveal-section py-32 px-margin-safe max-w-7xl mx-auto relative" id="certifications">

          <div className="flex flex-col items-center mb-24">
            <h3 className="reveal-item text-display-lg-mobile md:text-display-lg flex justify-center text-primary uppercase tracking-tighter text-center" style={{ marginBottom: '1.5rem' }}>
              CERTIFIC<span className="italic text-secondary">ATIONS</span>
            </h3>
            <p className="reveal-item text-body-lg text-on-surface-variant max-w-2xl text-center">
              Continuous learning is my foundation. A curated timeline of professional certifications showcasing my journey in AI, Software Development, and Cloud Technologies.
            </p>
          </div>

          {/* Stacked Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">

            {/* Card 1 (Odd) */}
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-left hard-shadow-secondary relative group flex flex-col min-h-[300px]">
              <div className="absolute w-20 h-20 bg-tertiary-fixed flex items-center justify-center rotate-12 hard-shadow-primary text-primary border-2 border-primary" style={{ top: '-1.5rem', right: '-1.5rem', zIndex: 10 }}>
                <span className="font-black italic text-xl">hp</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2025</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>AI for Beginners</h5>
              <p className="text-code-sm text-secondary font-bold uppercase" style={{ marginBottom: '1.5rem' }}>HP LIFE - Prof. Dev</p>

              <div className="mt-auto pt-4">
                <p className="text-code-sm text-gray-500 font-bold uppercase mb-4 opacity-50 group-hover:opacity-100 transition-opacity">ID: HP-CRED-2501</p>
                <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer w-full uppercase" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent' }}>
                  VIEW CERTIFICATE
                </button>
              </div>
            </div>

            {/* Card 2 (Even) */}
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-right hard-shadow-error relative group flex flex-col min-h-[300px] mt-4 md:mt-0">
              <div className="absolute w-20 h-20 bg-secondary flex items-center justify-center -rotate-12 hard-shadow-primary text-white border-2 border-primary" style={{ bottom: '-1.5rem', left: '-1.5rem', zIndex: 10 }}>
                <span className="font-bold text-[10px] tracking-tighter">NASSCOM</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2025</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>Cybersecurity Fundamentals</h5>
              <p className="text-code-sm text-error font-bold uppercase" style={{ marginBottom: '1.5rem' }}>FUTURESKILLS - Foundational Tech</p>

              <div className="mt-auto pt-4">
                <p className="text-code-sm text-gray-500 font-bold uppercase mb-4 opacity-50 group-hover:opacity-100 transition-opacity pl-20">ID: NSC-CYB-001</p>
                <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer w-full uppercase" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent' }}>
                  VIEW CERTIFICATE
                </button>
              </div>
            </div>

            {/* Card 3 (Odd) */}
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-left hard-shadow-secondary relative group flex flex-col min-h-[300px]">
              <div className="absolute w-20 h-20 bg-tertiary-fixed flex items-center justify-center rotate-12 hard-shadow-primary text-primary border-2 border-primary" style={{ top: '-1.5rem', right: '-1.5rem', zIndex: 10 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.25rem' }}>data_object</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2025</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>Python for Beginners</h5>
              <p className="text-code-sm text-secondary font-bold uppercase" style={{ marginBottom: '1.5rem' }}>SIMPLILEARN - Programming</p>

              <div className="mt-auto pt-4">
                <p className="text-code-sm text-gray-500 font-bold uppercase mb-4 opacity-50 group-hover:opacity-100 transition-opacity">ID: SMPL-PY-8890</p>
                <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer w-full uppercase" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent' }}>
                  VIEW CERTIFICATE
                </button>
              </div>
            </div>

            {/* Card 4 (Even) */}
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-right hard-shadow-error relative group flex flex-col min-h-[300px] mt-4 md:mt-0">
              <div className="absolute w-20 h-20 bg-secondary flex items-center justify-center -rotate-12 hard-shadow-primary text-white border-2 border-primary" style={{ bottom: '-1.5rem', left: '-1.5rem', zIndex: 10 }}>
                <span className="font-bold text-3xl">g</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2025</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>ChatGPT for Everyone</h5>
              <p className="text-code-sm text-error font-bold uppercase" style={{ marginBottom: '1.5rem' }}>GUVI - AI & Productivity</p>

              <div className="mt-auto pt-4">
                <p className="text-code-sm text-gray-500 font-bold uppercase mb-4 opacity-50 group-hover:opacity-100 transition-opacity pl-20">ID: GUV-GPT-10X</p>
                <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer w-full uppercase" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent' }}>
                  VIEW CERTIFICATE
                </button>
              </div>
            </div>

            {/* Card 5 (Odd) */}
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-left hard-shadow-secondary relative group flex flex-col min-h-[300px]">
              <div className="absolute w-20 h-20 bg-tertiary-fixed flex items-center justify-center rotate-12 hard-shadow-primary text-primary border-2 border-primary" style={{ top: '-1.5rem', right: '-1.5rem', zIndex: 10 }}>
                <span className="font-black italic text-xl">hp</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2025</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>Communication Mastery</h5>
              <p className="text-code-sm text-secondary font-bold uppercase" style={{ marginBottom: '1.5rem' }}>HP LIFE - Prof. Dev</p>

              <div className="mt-auto pt-4">
                <p className="text-code-sm text-gray-500 font-bold uppercase mb-4 opacity-50 group-hover:opacity-100 transition-opacity">ID: HP-CRED-2502</p>
                <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer w-full uppercase" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent' }}>
                  VIEW CERTIFICATE
                </button>
              </div>
            </div>

            {/* Card 6 (Even) */}
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-right hard-shadow-error relative group flex flex-col min-h-[300px] mt-4 md:mt-0">
              <div className="absolute w-20 h-20 bg-secondary flex items-center justify-center -rotate-12 hard-shadow-primary text-white border-2 border-primary" style={{ bottom: '-1.5rem', left: '-1.5rem', zIndex: 10 }}>
                <span className="font-bold text-[10px] tracking-tighter">NASSCOM</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2025</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>Data Science Foundation</h5>
              <p className="text-code-sm text-error font-bold uppercase" style={{ marginBottom: '1.5rem' }}>FUTURESKILLS - Data Science</p>

              <div className="mt-auto pt-4">
                <p className="text-code-sm text-gray-500 font-bold uppercase mb-4 opacity-50 group-hover:opacity-100 transition-opacity pl-20">ID: NSC-DS-023</p>
                <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer w-full uppercase" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent' }}>
                  VIEW CERTIFICATE
                </button>
              </div>
            </div>

            {/* Card 7 (Odd) */}
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-left hard-shadow-secondary relative group flex flex-col min-h-[300px]">
              <div className="absolute w-20 h-20 bg-tertiary-fixed flex items-center justify-center rotate-12 hard-shadow-primary text-primary border-2 border-primary" style={{ top: '-1.5rem', right: '-1.5rem', zIndex: 10 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.25rem' }}>data_object</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2025</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>Java Programming Basics</h5>
              <p className="text-code-sm text-secondary font-bold uppercase" style={{ marginBottom: '1.5rem' }}>SIMPLILEARN - Programming</p>

              <div className="mt-auto pt-4">
                <p className="text-code-sm text-gray-500 font-bold uppercase mb-4 opacity-50 group-hover:opacity-100 transition-opacity">ID: SMPL-JV-112</p>
                <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer w-full uppercase" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent' }}>
                  VIEW CERTIFICATE
                </button>
              </div>
            </div>

            {/* Card 8 (Even) */}
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-right hard-shadow-error relative group flex flex-col min-h-[300px] mt-4 md:mt-0">
              <div className="absolute w-20 h-20 bg-secondary flex items-center justify-center -rotate-12 hard-shadow-primary text-white border-2 border-primary" style={{ bottom: '-1.5rem', left: '-1.5rem', zIndex: 10 }}>
                <span className="font-black italic text-xl">hp</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2025</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>IT for Business Success</h5>
              <p className="text-code-sm text-error font-bold uppercase" style={{ marginBottom: '1.5rem' }}>HP LIFE - Technology</p>

              <div className="mt-auto pt-4">
                <p className="text-code-sm text-gray-500 font-bold uppercase mb-4 opacity-50 group-hover:opacity-100 transition-opacity pl-20">ID: HP-CRED-2503</p>
                <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer w-full uppercase" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent' }}>
                  VIEW CERTIFICATE
                </button>
              </div>
            </div>

            {/* Card 9 (Odd) */}
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-left hard-shadow-secondary relative group flex flex-col min-h-[300px]">
              <div className="absolute w-20 h-20 bg-tertiary-fixed flex items-center justify-center rotate-12 hard-shadow-primary text-primary border-2 border-primary" style={{ top: '-1.5rem', right: '-1.5rem', zIndex: 10 }}>
                <span className="font-bold text-[10px] tracking-tighter">NASSCOM</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2025</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>Cloud Computing Basics</h5>
              <p className="text-code-sm text-secondary font-bold uppercase" style={{ marginBottom: '1.5rem' }}>FUTURESKILLS - Cloud</p>

              <div className="mt-auto pt-4">
                <p className="text-code-sm text-gray-500 font-bold uppercase mb-4 opacity-50 group-hover:opacity-100 transition-opacity">ID: NSC-CLD-990</p>
                <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer w-full uppercase" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent' }}>
                  VIEW CERTIFICATE
                </button>
              </div>
            </div>

            {/* Card 10 (Even) */}
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-right hard-shadow-error relative group flex flex-col min-h-[300px] mt-4 md:mt-0">
              <div className="absolute w-20 h-20 bg-secondary flex items-center justify-center -rotate-12 hard-shadow-primary text-white border-2 border-primary" style={{ bottom: '-1.5rem', left: '-1.5rem', zIndex: 10 }}>
                <span className="font-bold text-3xl">g</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2025</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>Intro to Generative AI</h5>
              <p className="text-code-sm text-error font-bold uppercase" style={{ marginBottom: '1.5rem' }}>GUVI - Artificial Intelligence</p>

              <div className="mt-auto pt-4">
                <p className="text-code-sm text-gray-500 font-bold uppercase mb-4 opacity-50 group-hover:opacity-100 transition-opacity pl-20">ID: GUV-GEN-300</p>
                <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer w-full uppercase" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent' }}>
                  VIEW CERTIFICATE
                </button>
              </div>
            </div>

            {/* Card 11 (Odd) */}
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-left hard-shadow-secondary relative group flex flex-col min-h-[300px]">
              <div className="absolute w-20 h-20 bg-tertiary-fixed flex items-center justify-center rotate-12 hard-shadow-primary text-primary border-2 border-primary" style={{ top: '-1.5rem', right: '-1.5rem', zIndex: 10 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.25rem' }}>data_object</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2025</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>HTML, CSS & Javascript</h5>
              <p className="text-code-sm text-secondary font-bold uppercase" style={{ marginBottom: '1.5rem' }}>SIMPLILEARN - Web Development</p>

              <div className="mt-auto pt-4">
                <p className="text-code-sm text-gray-500 font-bold uppercase mb-4 opacity-50 group-hover:opacity-100 transition-opacity">ID: SMPL-WEB-112</p>
                <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer w-full uppercase" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent' }}>
                  VIEW CERTIFICATE
                </button>
              </div>
            </div>

            {/* Card 12 (Even) */}
            <div className="reveal-item bg-white border-2 border-primary p-10 tilted-right hard-shadow-error relative group flex flex-col min-h-[300px] mt-4 md:mt-0">
              <div className="absolute w-20 h-20 bg-secondary flex items-center justify-center -rotate-12 hard-shadow-primary text-white border-2 border-primary" style={{ bottom: '-1.5rem', left: '-1.5rem', zIndex: 10 }}>
                <span className="font-black italic text-xl">hp</span>
              </div>
              <span className="text-code-sm text-on-surface-variant font-bold">2025</span>
              <h5 className="font-black text-primary" style={{ fontSize: '1.875rem', marginTop: '0.5rem' }}>Excel Skills for Business</h5>
              <p className="text-code-sm text-error font-bold uppercase" style={{ marginBottom: '1.5rem' }}>HP LIFE - Prof. Dev</p>

              <div className="mt-auto pt-4">
                <p className="text-code-sm text-gray-500 font-bold uppercase mb-4 opacity-50 group-hover:opacity-100 transition-opacity pl-20">ID: HP-CRED-2504</p>
                <button className="border-2 border-primary font-bold transition-all hover:bg-primary text-primary hover:text-white cursor-pointer w-full uppercase" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent' }}>
                  VIEW CERTIFICATE
                </button>
              </div>
            </div>

          </div>

          {/* View More Button */}
          <div className="flex justify-center mt-20 reveal-item">
            <button className="btn-primary magnetic-btn text-[11px] font-bold">
              VIEW ALL CERTIFICATIONS
            </button>
          </div>

        </section>

        {/* Contact Section */}
        <section className="reveal-section py-32 px-margin-safe text-center overflow-hidden" id="contact" style={{ paddingTop: '16rem', paddingBottom: '16rem' }}>
          <div className="reveal-item">
            <p className="text-code-sm uppercase font-bold tracking-widest text-on-surface-variant" style={{ marginBottom: '1rem' }}>READY TO SCALE?</p>
            <h2 className="text-display-2xl chromatic-text cursor-pointer select-none" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
              TALK.
            </h2>
            <div className="flex flex-wrap justify-center gap-12" style={{ marginTop: '3rem' }}>
              <a className="text-headline-md group relative inline-block text-primary cursor-pointer hover:text-secondary transition-colors" href="https://github.com/Spidy0519" target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.875rem', textDecoration: 'none' }}>
                GITHUB
              </a>
              <a className="text-headline-md group relative inline-block text-primary cursor-pointer hover:text-secondary transition-colors" href="https://www.linkedin.com/in/rahuman-t/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.875rem', textDecoration: 'none' }}>
                LINKEDIN
              </a>
              <a className="text-headline-md group relative inline-block text-primary cursor-pointer hover:text-secondary transition-colors" href="https://leetcode.com/u/rahuman19/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.875rem', textDecoration: 'none' }}>
                LEETCODE
              </a>
              <a className="text-headline-md group relative inline-block text-primary cursor-pointer hover:text-secondary transition-colors" href="https://www.hackerrank.com/profile/rahuman0507" target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.875rem', textDecoration: 'none' }}>
                HACKERRANK
              </a>
              <a className="text-headline-md group relative inline-block text-primary cursor-pointer hover:text-secondary transition-colors" href="mailto:rahuman0507@gmail.com" style={{ fontSize: '1.875rem', textDecoration: 'none' }}>
                MAIL
              </a>
            </div>
          </div>
        </section>

      </main>

      <footer className="bg-primary text-on-primary py-20 px-margin-safe flex flex-col items-center justify-center text-center">
        <div className="flex flex-col items-center gap-6">
          <a href="mailto:rahuman0507@gmail.com" className="text-xl md:text-2xl font-medium tracking-widest hover:text-secondary transition-all duration-300">
            rahuman0507@gmail.com
          </a>

          <div className="w-12 h-[2px] bg-secondary my-2"></div>

          <p className="text-xs md:text-sm font-mono tracking-widest text-white/70 uppercase">
            RAHUMAN © 2026 <span className="mx-2 text-secondary/70">//</span> AI & ML Developer <span className="mx-2 text-secondary/70">|</span> BUILT IN THE FUTURE
          </p>
        </div>
      </footer>
    </div>
  );
}

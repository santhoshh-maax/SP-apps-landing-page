(function () {
  'use strict';

  const isMobile = window.innerWidth < 768;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReduced) {
    initThreeBackground();
  }

  function initThreeBackground() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.002);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: !isMobile,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));

    const particleCount = isMobile ? 80 : 180;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = [];
    const connections = [];

    const color1 = new THREE.Color(0x6366f1);
    const color2 = new THREE.Color(0xa855f7);
    const color3 = new THREE.Color(0x06b6d4);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10;

      const t = Math.random();
      let col;
      if (t < 0.4) col = color1;
      else if (t < 0.7) col = color2;
      else col = color3;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = Math.random() * (isMobile ? 2 : 3) + 0.5;

      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.01,
      });
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: isMobile ? 0.12 : 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    let lineGeometry, lineMaterial, lineMesh;
    if (!isMobile) {
      lineGeometry = new THREE.BufferGeometry();
      const maxLines = particleCount * 3;
      const linePositions = new Float32Array(maxLines * 6);
      const lineColors = new Float32Array(maxLines * 6);
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
      lineGeometry.setDrawRange(0, 0);

      lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
      });

      lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lineMesh);
    }

    const sphereGroup = new THREE.Group();
    if (!isMobile) {
      const sphereCount = 3;
      for (let i = 0; i < sphereCount; i++) {
        const sphereGeo = new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({
          color: i === 0 ? 0x6366f1 : i === 1 ? 0xa855f7 : 0x06b6d4,
          transparent: true,
          opacity: 0.4 + Math.random() * 0.3,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 20 - 5
        );
        sphere.userData = {
          speed: 0.002 + Math.random() * 0.005,
          phase: Math.random() * Math.PI * 2,
          radius: 1 + Math.random() * 2,
        };
        sphereGroup.add(sphere);

        const glowGeo = new THREE.SphereGeometry(0.6 + Math.random() * 0.6, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
          color: sphereMat.color,
          transparent: true,
          opacity: 0.1,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(sphere.position);
        glow.userData = { parent: sphere };
        sphereGroup.add(glow);
      }
      scene.add(sphereGroup);
    }

    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    function onMouseMove(event) {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    function onTouchMove(event) {
      if (event.touches.length > 0) {
        mouseX = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: true });

    function updateConnections() {
      if (!lineMesh) return;
      const pos = particleSystem.geometry.attributes.position.array;
      const lPos = lineMesh.geometry.attributes.position.array;
      const lCol = lineMesh.geometry.attributes.color.array;
      let idx = 0;
      const maxDist = isMobile ? 0 : 4;

      for (let i = 0; i < particleCount && idx < lPos.length / 6; i++) {
        for (let j = i + 1; j < particleCount && idx < lPos.length / 6; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < maxDist) {
            const alpha = 1 - dist / maxDist;
            lPos[idx * 6] = pos[i * 3];
            lPos[idx * 6 + 1] = pos[i * 3 + 1];
            lPos[idx * 6 + 2] = pos[i * 3 + 2];
            lPos[idx * 6 + 3] = pos[j * 3];
            lPos[idx * 6 + 4] = pos[j * 3 + 1];
            lPos[idx * 6 + 5] = pos[j * 3 + 2];

            const col = colors;
            lCol[idx * 6] = col[i * 3] * alpha;
            lCol[idx * 6 + 1] = col[i * 3 + 1] * alpha;
            lCol[idx * 6 + 2] = col[i * 3 + 2] * alpha;
            lCol[idx * 6 + 3] = col[j * 3] * alpha;
            lCol[idx * 6 + 4] = col[j * 3 + 1] * alpha;
            lCol[idx * 6 + 5] = col[j * 3 + 2] * alpha;
            idx++;
          }
        }
      }

      lineMesh.geometry.setDrawRange(0, idx * 2);
      lineMesh.geometry.attributes.position.needsUpdate = true;
      lineMesh.geometry.attributes.color.needsUpdate = true;
    }

    let time = 0;

    function animate() {
      requestAnimationFrame(animate);
      time += 0.001;

      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      const pos = particleSystem.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;

        if (Math.abs(pos[i * 3]) > 30) velocities[i].x *= -1;
        if (Math.abs(pos[i * 3 + 1]) > 30) velocities[i].y *= -1;
        if (Math.abs(pos[i * 3 + 2]) > 20) velocities[i].z *= -1;
      }

      particleSystem.geometry.attributes.position.needsUpdate = true;

      if (!isMobile) {
        updateConnections();
      }

      sphereGroup.children.forEach((child) => {
        if (child.userData.parent) {
          const parent = child.userData.parent;
          const scale = 1 + Math.sin(time * 2 + parent.userData.phase) * 0.3;
          child.scale.set(scale, scale, scale);
        } else {
          child.position.x += Math.sin(time * child.userData.speed + child.userData.phase) * 0.01;
          child.position.y += Math.cos(time * child.userData.speed + child.userData.phase) * 0.01;
        }
      });

      camera.position.x += (targetX * 2 - camera.position.x) * 0.01;
      camera.position.y += (targetY * 2 - camera.position.y) * 0.01;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }

    animate();

    let resizeTimeout;
    function onResize() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, w < 768 ? 1.5 : 2));
      }, 200);
    }

    window.addEventListener('resize', onResize);
  }

  const mobileMenu = document.getElementById('mobile-menu');
  const mobileOverlay = document.getElementById('mobile-overlay');
  const hamburger = document.getElementById('hamburger');
  const menuLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];

  function toggleMenu(open) {
    if (!mobileMenu || !mobileOverlay || !hamburger) return;
    const isOpen = open !== undefined ? open : !mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open', isOpen);
    mobileOverlay.classList.toggle('show', isOpen);
    hamburger.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  if (hamburger) {
    hamburger.addEventListener('click', function () {
      toggleMenu();
    });
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', function () {
      toggleMenu(false);
    });
  }

  menuLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      toggleMenu(false);
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const targetPos = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  });

  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px',
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-up, .fade-left, .fade-right, .fade-scale').forEach(function (el) {
    observer.observe(el);
  });

  const modals = document.querySelectorAll('.modal');
  const modalCloseButtons = document.querySelectorAll('.modal-close');

  modalCloseButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      this.closest('.modal').classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  modals.forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === this) {
        this.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      modals.forEach(function (m) { m.classList.remove('open'); });
      document.body.style.overflow = '';
    }
  });

  document.querySelectorAll('[data-modal-target]').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      const modalId = this.dataset.modalTarget;
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  document.querySelectorAll('[data-screenshot]').forEach(function (item) {
    item.addEventListener('click', function () {
      const modalId = this.dataset.modalTarget;
      const modal = document.getElementById(modalId);
      if (!modal) return;
      const img = modal.querySelector('img');
      if (img) {
        const src = this.dataset.bg || this.querySelector('img')?.src;
        if (src) {
          img.src = src;
          img.style.display = '';
        }
      }
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  document.querySelectorAll('.screenshot-gallery').forEach(function (gallery) {
    let isDown = false;
    let startX;
    let scrollLeft;

    gallery.addEventListener('mousedown', function (e) {
      isDown = true;
      this.classList.add('active');
      startX = e.pageX - this.offsetLeft;
      scrollLeft = this.scrollLeft;
      this.style.cursor = 'grabbing';
    });

    gallery.addEventListener('mouseleave', function () {
      isDown = false;
      this.style.cursor = 'grab';
    });

    gallery.addEventListener('mouseup', function () {
      isDown = false;
      this.style.cursor = 'grab';
    });

    gallery.addEventListener('mousemove', function (e) {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - this.offsetLeft;
      const walk = (x - startX) * 1.5;
      this.scrollLeft = scrollLeft - walk;
    });
  });

  const navbar = document.querySelector('nav');
  let lastScroll = 0;

  window.addEventListener('scroll', function () {
    const currentScroll = window.pageYOffset;
    if (navbar) {
      if (currentScroll > 100) {
        navbar.style.background = 'rgba(10, 10, 26, 0.95)';
        navbar.style.backdropFilter = 'blur(20px)';
      } else {
        navbar.style.background = 'rgba(10, 10, 26, 0.8)';
      }
    }
    lastScroll = currentScroll;
  }, { passive: true });

  document.querySelectorAll('.download-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var releaseUrl = this.getAttribute('href');
      var tag = releaseUrl.substring(releaseUrl.lastIndexOf('/') + 1);
      var api = 'https://api.github.com/repos/santhoshh-maax/SP-apps-landing-page/releases/tags/' + encodeURIComponent(tag);
      fetch(api).then(function (r) { return r.json(); }).then(function (data) {
        if (data && data.assets && data.assets.length > 0) {
          window.location.href = data.assets[0].browser_download_url;
        }
      }).catch(function () {
        window.location.href = releaseUrl;
      });
    });
  });

  console.log('%c SP Apps Landing Page ', 'background:#6366f1;color:white;font-size:16px;padding:8px 12px;border-radius:4px;font-weight:bold;');
  console.log('%c Built with ❤️ using HTML, Tailwind, Three.js ', 'color:#94a3b8;font-size:12px;');
})();

// Enhanced Particle System and Visual Effects

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.rainColumns = [];
    this.init();
  }

  init() {
    this.createParticles();
    this.createDigitalRain();
    this.animate();
  }

  createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    // Create floating particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      const size = Math.random() * 6 + 2;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 15 + 's';
      particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
      
      container.appendChild(particle);
      this.particles.push(particle);
    }
  }

  createDigitalRain() {
    const container = document.getElementById('digitalRain');
    if (!container) return;

    const chars = '01';
    const columns = Math.floor(window.innerWidth / 20);

    for (let i = 0; i < columns; i++) {
      const column = document.createElement('div');
      column.className = 'rain-column';
      column.style.left = (i * 20) + 'px';
      column.style.animationDelay = Math.random() * 8 + 's';
      
      // Generate random binary string
      let text = '';
      for (let j = 0; j < 50; j++) {
        text += chars[Math.floor(Math.random() * chars.length)] + '<br>';
      }
      column.innerHTML = text;
      
      container.appendChild(column);
      this.rainColumns.push(column);
    }
  }

  animate() {
    // Add subtle movement to particles
    this.particles.forEach((particle, index) => {
      const time = Date.now() * 0.001;
      const x = Math.sin(time + index) * 2;
      const y = Math.cos(time + index * 0.5) * 2;
      particle.style.transform += ` translate(${x}px, ${y}px)`;
    });

    requestAnimationFrame(() => this.animate());
  }

  // Method to toggle particles based on settings
  toggleParticles(enabled) {
    const containers = ['particles', 'digitalRain'];
    containers.forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        container.style.display = enabled ? 'block' : 'none';
      }
    });

    const glowOrbs = document.querySelectorAll('.glow-orb');
    glowOrbs.forEach(orb => {
      orb.style.display = enabled ? 'block' : 'none';
    });

    const cyberGrid = document.querySelector('.cyber-grid');
    if (cyberGrid) {
      cyberGrid.style.display = enabled ? 'block' : 'none';
    }
  }
}

// Enhanced Visual Effects
class VisualEffects {
  constructor() {
    this.init();
  }

  init() {
    this.addHoverEffects();
    this.addClickEffects();
    this.addScrollEffects();
  }

  addHoverEffects() {
    // Enhanced button hover effects
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.addEventListener('mouseenter', (e) => {
        this.createRipple(e.target, e);
      });
    });

    // Card hover effects
    const cards = document.querySelectorAll('.mode-card, .stat-card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', (e) => {
        this.addGlowEffect(e.target);
      });
      
      card.addEventListener('mouseleave', (e) => {
        this.removeGlowEffect(e.target);
      });
    });
  }

  addClickEffects() {
    document.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        this.createClickBurst(e);
      }
    });
  }

  addScrollEffects() {
    // Parallax effect for background elements
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const shapes = document.querySelectorAll('.shape');
      
      shapes.forEach((shape, index) => {
        const speed = 0.5 + (index * 0.1);
        shape.style.transform = `translateY(${scrolled * speed}px)`;
      });
    });
  }

  createRipple(element, event) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    element.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  addGlowEffect(element) {
    element.style.boxShadow = '0 0 30px rgba(138, 43, 226, 0.6), 0 0 60px rgba(138, 43, 226, 0.3)';
  }

  removeGlowEffect(element) {
    element.style.boxShadow = '';
  }

  createClickBurst(event) {
    const burst = document.createElement('div');
    burst.className = 'click-burst';
    burst.style.left = event.clientX + 'px';
    burst.style.top = event.clientY + 'px';
    
    document.body.appendChild(burst);
    
    setTimeout(() => {
      burst.remove();
    }, 1000);
  }
}

// Initialize systems when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const particleSystem = new ParticleSystem();
  const visualEffects = new VisualEffects();
  
  // Make particle system globally accessible for settings
  window.particleSystem = particleSystem;
  
  // Add CSS for dynamic effects
  const style = document.createElement('style');
  style.textContent = `
    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: scale(0);
      animation: rippleEffect 0.6s linear;
      pointer-events: none;
    }
    
    @keyframes rippleEffect {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
    
    .click-burst {
      position: fixed;
      width: 20px;
      height: 20px;
      background: radial-gradient(circle, rgba(138, 43, 226, 1) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      animation: burstEffect 1s ease-out;
      z-index: 9999;
    }
    
    @keyframes burstEffect {
      0% {
        transform: scale(0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: scale(10) rotate(360deg);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
});

// Performance optimization
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Initialize heavy effects only when browser is idle
    console.log('Enhanced visual effects initialized');
  });
}

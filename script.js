// ===== Navigation Functionality =====
const navbar = document.getElementById('navbar');
const navLinks = document.getElementById('navLinks');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinkItems = document.querySelectorAll('.nav-link');

// Navbar scroll effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
mobileMenuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
});

// Close mobile menu when clicking a link
navLinkItems.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileMenuBtn.classList.remove('active');
    });
});

// Active nav link based on scroll position
const sections = document.querySelectorAll('section');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    navLinkItems.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ===== Hero Stats Counter Animation =====
const statNumbers = document.querySelectorAll('.stat-number');

const animateCounter = (element) => {
    const target = parseInt(element.getAttribute('data-target'));
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;

    const updateCounter = () => {
        current += increment;
        if (current < target) {
            element.textContent = Math.floor(current);
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    };

    updateCounter();
};

// Intersection Observer for counter animation
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumber = entry.target;
            animateCounter(statNumber);
            counterObserver.unobserve(statNumber);
        }
    });
}, { threshold: 0.5 });

statNumbers.forEach(stat => {
    counterObserver.observe(stat);
});

// Slideshow section removed — no slideshow code needed.

// ===== Scroll Animations (AOS) =====
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
};

const animateOnScroll = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('aos-animate');
        }
    });
}, observerOptions);

// Observe all elements with data-aos attribute
document.querySelectorAll('[data-aos]').forEach(element => {
    animateOnScroll.observe(element);
});

// ===== Back to Top Button =====
const backToTopBtn = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
});

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// ===== Smooth Scroll for Navigation Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navbarHeight = navbar.offsetHeight;
            const targetPosition = target.offsetTop - navbarHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Form Submission Handler =====
const contactForm = document.querySelector('.contact-form');

// API base — mirrors the convention used elsewhere on the site
const CONTACT_API_BASE = (typeof window.BACKEND_URL === 'string' && window.BACKEND_URL)
    ? window.BACKEND_URL + '/api'
    : (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
        ? 'http://localhost:5000/api'
        : 'https://api.dodsmarthealth.com/api');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = contactForm.querySelector('.btn-submit');
        const btnLabel = submitBtn ? submitBtn.querySelector('span') : null;
        const originalLabel = btnLabel ? btnLabel.textContent : '';

        // Collect form data
        const fd = new FormData(contactForm);
        const payload = {
            name: (fd.get('name') || '').toString().trim(),
            email: (fd.get('email') || '').toString().trim(),
            phone: (fd.get('phone') || '').toString().trim(),
            company: (fd.get('company') || '').toString().trim(),
            interest: (fd.get('interest') || '').toString().trim(),
            message: (fd.get('message') || '').toString().trim(),
        };

        if (!payload.name || !payload.email || !payload.message) {
            showNotification('Please fill in your name, email and message.', 'error');
            return;
        }

        // Lock the button while sending
        if (submitBtn) submitBtn.disabled = true;
        if (btnLabel) btnLabel.textContent = 'Sending...';

        try {
            const res = await fetch(`${CONTACT_API_BASE}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Something went wrong. Please try again.');
            }

            showNotification(
                data.message || 'Your request is submitted. Our team will contact you soon.',
                'success'
            );
            contactForm.reset();
        } catch (err) {
            showNotification(
                err.message || 'Could not send your message. Please try again later.',
                'error'
            );
        } finally {
            if (submitBtn) submitBtn.disabled = false;
            if (btnLabel) btnLabel.textContent = originalLabel || 'Send Message';
        }
    });
}

// Notification function
const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 2rem;
        padding: 1.5rem 2rem;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 1rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideInRight 0.5s ease;
        max-width: 400px;
        font-weight: 600;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
};

// Add notification animations to document
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== Parallax Effect for Hero Section =====
const heroSection = document.querySelector('.hero');
const animatedShapes = document.querySelectorAll('.shape');

window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    
    if (scrolled < window.innerHeight) {
        animatedShapes.forEach((shape, index) => {
            const speed = 0.5 + (index * 0.1);
            const yPos = -(scrolled * speed);
            shape.style.transform = `translateY(${yPos}px)`;
        });
    }
});

// ===== Floating Cards Animation =====
const floatingCards = document.querySelectorAll('.floating-card');

floatingCards.forEach((card, index) => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'scale(1.1) rotate(5deg)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'scale(1) rotate(0deg)';
    });
});

// ===== Feature Cards 3D Tilt Effect =====
const featureCards = document.querySelectorAll('.feature-card');

featureCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});

// ===== Service Cards Magnetic Effect =====
const serviceCards = document.querySelectorAll('.service-card');

serviceCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        card.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px) scale(1.05)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translate(0, 0) scale(1)';
    });
});

// ===== Loading Animation =====
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    
    // Trigger initial animations
    setTimeout(() => {
        document.querySelectorAll('.fade-in').forEach(element => {
            element.style.opacity = '1';
        });
    }, 100);
});

// ===== Cursor Trail Effect (Optional) =====
const createCursorTrail = () => {
    let lastX = 0;
    let lastY = 0;
    let isMoving = false;
    
    document.addEventListener('mousemove', (e) => {
        if (!isMoving) {
            isMoving = true;
            requestAnimationFrame(() => {
                if (Math.abs(e.clientX - lastX) > 5 || Math.abs(e.clientY - lastY) > 5) {
                    const trail = document.createElement('div');
                    trail.className = 'cursor-trail';
                    trail.style.cssText = `
                        position: fixed;
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        background: var(--primary-color);
                        opacity: 0.3;
                        pointer-events: none;
                        z-index: 9999;
                        left: ${e.clientX - 5}px;
                        top: ${e.clientY - 5}px;
                        animation: trailFade 0.6s ease-out forwards;
                    `;
                    document.body.appendChild(trail);
                    
                    setTimeout(() => trail.remove(), 600);
                    
                    lastX = e.clientX;
                    lastY = e.clientY;
                }
                isMoving = false;
            });
        }
    });
    
    const trailStyle = document.createElement('style');
    trailStyle.textContent = `
        @keyframes trailFade {
            0% {
                transform: scale(1);
                opacity: 0.3;
            }
            100% {
                transform: scale(0);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(trailStyle);
};

// Uncomment to enable cursor trail effect
// createCursorTrail();

// ===== Lazy Loading Images (if you add real images) =====
const lazyLoadImages = () => {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
};

lazyLoadImages();

// ===== Performance Optimization =====
// Debounce function for scroll events
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Throttle function for high-frequency events
const throttle = (func, limit) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// ===== Easter Egg: Konami Code =====
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
    if (e.key === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            activateEasterEgg();
            konamiIndex = 0;
        }
    } else {
        konamiIndex = 0;
    }
});

const activateEasterEgg = () => {
    document.body.style.animation = 'rainbow 2s linear infinite';
    showNotification('🎉 Easter Egg Activated! You found the secret!', 'success');
    
    const rainbowStyle = document.createElement('style');
    rainbowStyle.textContent = `
        @keyframes rainbow {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
    `;
    document.head.appendChild(rainbowStyle);
    
    setTimeout(() => {
        document.body.style.animation = '';
    }, 5000);
};

// ===== Console Message =====
console.log('%cDOD Healthcare Kiosk', 'color: #6366f1; font-size: 24px; font-weight: bold;');
console.log('%cBuilt with care by Amazemedics Pvt.Ltd.', 'color: #64748b; font-size: 14px;');
console.log('%cWant to work with us? Contact: info@amazemedics.com', 'color: #10b981; font-size: 12px;');

// ===== Initialize Everything =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Developed by https://webtroopsdevelopment.com/');
    
    // Add any additional initialization here
    
    // Preload critical resources
    const preloadLinks = [
        'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap',
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    ];
    
    preloadLinks.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        document.head.appendChild(link);
    });
});

// ===== Service Worker for PWA (Optional) =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment to enable service worker
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered:', registration))
        //     .catch(error => console.log('SW registration failed:', error));
    });
}

// Gallery lightbox is now self-contained inline script in index.html
function initGalleryView() {}

// ===== Specifications Tabs =====
function initSpecifications() {
    const navBtns = document.querySelectorAll('.specs-nav-btn');
    const panels = document.querySelectorAll('.spec-panel');
    
    if (!navBtns.length || !panels.length) return;
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-spec') || btn.getAttribute('data-target');
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            panels.forEach(panel => {
                const match = panel.id === `spec-${target}` || panel.getAttribute('data-panel') === target || panel.id === target;
                panel.classList.toggle('active', match);
            });
        });
    });
}

// ===== Partnership Stats Counter =====
function initPartnershipCounter() {
    const partnershipItems = document.querySelectorAll('.partnership-item h4');
    if (!partnershipItems.length) return;
    
    let partnershipAnimated = false;
    
    const partnershipObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !partnershipAnimated) {
                partnershipAnimated = true;
                partnershipItems.forEach(item => {
                    const target = parseInt(item.getAttribute('data-target'));
                    animateCounter(item, target);
                });
            }
        });
    });
    
    partnershipObserver.observe(partnershipItems[0]);
}

// ===== Animation on Scroll for New Sections =====
function animateNewSections() {
    const brandCards = document.querySelectorAll('.brand-card');
    const certCards = document.querySelectorAll('.cert-card');
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    [...brandCards, ...certCards, ...galleryItems].forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'all 0.6s ease';
        observer.observe(item);
    });
}

// ===== Initialize New Features =====
initGalleryView();
initSpecifications();
initPartnershipCounter();
animateNewSections();

// ===== WhatsApp Chatbox Functionality =====
const whatsappBtn = document.getElementById('whatsappBtn');
const whatsappChatbox = document.getElementById('whatsappChatbox');
const chatboxClose = document.getElementById('chatboxClose');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

// WhatsApp phone number
const WHATSAPP_NUMBER = '917303898884';

// Toggle chatbox
whatsappBtn.addEventListener('click', () => {
    whatsappChatbox.classList.toggle('active');
    if (whatsappChatbox.classList.contains('active')) {
        chatInput.focus();
    }
});

// Close chatbox
chatboxClose.addEventListener('click', () => {
    whatsappChatbox.classList.remove('active');
});

// Send message function
function sendWhatsAppMessage() {
    const message = chatInput.value.trim();
    
    if (message === '') {
        chatInput.focus();
        return;
    }
    
    // Show user message in chatbox
    const chatBody = document.querySelector('.chatbox-body');
    const userMessageHTML = `
        <div class="chat-message user-message">
            <div class="message-content">
                <p>${escapeHtml(message)}</p>
            </div>
            <div class="message-avatar">👤</div>
        </div>
    `;
    chatBody.insertAdjacentHTML('beforeend', userMessageHTML);
    
    // Scroll to bottom
    chatBody.scrollTop = chatBody.scrollHeight;
    
    // Create WhatsApp URL with encoded message
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    // Clear input
    chatInput.value = '';
    
    // Small delay before opening WhatsApp
    setTimeout(() => {
        // Open WhatsApp in new tab
        window.open(whatsappURL, '_blank');
        
        // Show confirmation message
        const confirmMessageHTML = `
            <div class="chat-message bot-message">
                <div class="message-avatar">🩺</div>
                <div class="message-content">
                    <p>Redirecting you to WhatsApp... 📱</p>
                </div>
            </div>
        `;
        chatBody.insertAdjacentHTML('beforeend', confirmMessageHTML);
        chatBody.scrollTop = chatBody.scrollHeight;
        
        // Close chatbox after 2 seconds
        setTimeout(() => {
            whatsappChatbox.classList.remove('active');
        }, 2000);
    }, 500);
}

// Send on button click
chatSend.addEventListener('click', sendWhatsAppMessage);

// Send on Enter key
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendWhatsAppMessage();
    }
});

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close chatbox when clicking outside
document.addEventListener('click', (e) => {
    if (!whatsappChatbox.contains(e.target) &&
        !whatsappBtn.contains(e.target) &&
        whatsappChatbox.classList.contains('active')) {
        whatsappChatbox.classList.remove('active');
    }
});

// Dynamic section loading is handled by the inline script in index.html

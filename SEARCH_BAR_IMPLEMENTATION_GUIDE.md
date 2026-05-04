# Extending Search Bar with Glassy Effect - Implementation Guide

## Overview
A search bar that expands to the left when clicked, featuring a glassmorphic (glassy) design with backdrop blur effects. The input expands smoothly from 0px to 300px width, anchored to the right side of a search icon button.

---

## HTML Structure

```html
<div class="search-container">
  <form class="search-form" action="/search" method="get" role="search">
    <input
      type="search"
      name="q"
      class="search-input"
      placeholder="Search"
      aria-label="Search"
      autocomplete="off"
    >
  </form>
  <button
    type="button"
    class="search-toggle"
    aria-label="Search"
    aria-expanded="false"
  >
    <!-- Search icon SVG here -->
  </button>
</div>
```

---

## CSS Implementation

### Container Setup
```css
.search-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: visible; /* Critical: allows dropdown to extend */
  z-index: 10;
}
```

### Search Form (Expandable Container)
```css
.search-form {
  position: absolute;
  right: 0;                    /* Anchored to right edge */
  top: 50%;
  transform: translateY(-50%);
  width: 0;                    /* Hidden by default */
  min-width: 0;
  max-width: 300px;            /* Desktop max width */
  opacity: 0;
  overflow: visible;            /* Critical: allows suggestions dropdown */
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
}

/* Active state - expanded */
.search-container.search-active .search-form {
  width: 300px;                /* Desktop: expands to 300px */
  min-width: 300px;
  opacity: 1;
  pointer-events: auto;
}

/* Mobile responsive */
@media screen and (max-width: 768px) {
  .search-container.search-active .search-form {
    width: 250px;              /* Mobile: expands to 250px */
  }
}
```

### Search Input (Glassy Effect)
```css
.search-input {
  width: 100%;
  height: 38px;                /* Matches button height */
  padding: 0 1rem;              /* Horizontal padding only */
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 9999px;        /* Fully rounded */
  
  /* GLASSY EFFECT - Key properties */
  background: rgba(0, 0, 0, 0.4);           /* Semi-transparent dark */
  backdrop-filter: blur(12px);              /* Blur effect */
  -webkit-backdrop-filter: blur(12px);      /* Safari support */
  
  color: #ffffff;               /* Text color */
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;
  direction: ltr;
  text-align: left;
  line-height: 38px;            /* Vertically centers text */
  box-sizing: border-box;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.search-input:focus {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(0, 0, 0, 0.5);  /* Slightly darker on focus */
}
```

### Search Toggle Button
```css
.search-toggle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;                  /* Matches input height */
  height: 38px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  cursor: pointer;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}
```

---

## JavaScript Functionality

```javascript
(function() {
  const searchContainer = document.querySelector('.search-container');
  const searchToggle = document.querySelector('.search-toggle');
  const searchInput = document.querySelector('.search-input');
  const searchForm = document.querySelector('.search-form');
  
  if (!searchContainer || !searchToggle || !searchInput) return;

  function openSearch() {
    searchContainer.classList.add('search-active');
    searchToggle.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      searchInput.focus();
    }, 100);
  }

  function closeSearch() {
    searchContainer.classList.remove('search-active');
    searchToggle.setAttribute('aria-expanded', 'false');
    searchInput.value = '';
  }

  // Toggle on button click
  searchToggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isActive = searchContainer.classList.contains('search-active');
    if (isActive) {
      closeSearch();
    } else {
      openSearch();
    }
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (searchContainer.classList.contains('search-active') &&
        !searchContainer.contains(e.target)) {
      closeSearch();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchContainer.classList.contains('search-active')) {
      closeSearch();
    }
  });

  // Submit form on Enter
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      if (searchInput.value.trim()) {
        closeSearch();
      } else {
        e.preventDefault();
      }
    });
  }
})();
```

---

## Key Dimensions & Specifications

### Desktop
- **Expanded Width**: 300px
- **Input Height**: 38px
- **Button Size**: 38px × 38px
- **Border Radius**: 9999px (fully rounded)
- **Padding**: 0 1rem (16px horizontal)
- **Font Size**: 14px

### Mobile (≤768px)
- **Expanded Width**: 250px
- All other dimensions remain the same

### Glassy Effect Properties
- **Background**: `rgba(0, 0, 0, 0.4)` (40% opacity black)
- **Backdrop Blur**: 12px
- **Border**: `1px solid rgba(255, 255, 255, 0.2)` (20% opacity white)
- **Focus Background**: `rgba(0, 0, 0, 0.5)` (50% opacity black)
- **Focus Border**: `rgba(255, 255, 255, 0.4)` (40% opacity white)

### Animation
- **Duration**: 0.3s
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (smooth ease)
- **Properties**: width, opacity

---

## Color Variations

### Dark Theme (Default)
```css
background: rgba(0, 0, 0, 0.4);
border-color: rgba(255, 255, 255, 0.2);
color: #ffffff;
```

### Light Theme (When menu is open)
```css
background: rgba(255, 255, 255, 0.95);
border-color: rgba(0, 0, 0, 0.1);
color: #000000;
```

---

## Critical CSS Properties

1. **`overflow: visible`** on both container and form - allows dropdown to extend beyond boundaries
2. **`position: absolute`** on form - enables leftward expansion from right anchor
3. **`right: 0`** - anchors form to right edge, expands leftward
4. **`backdrop-filter: blur(12px)`** - creates the glassy effect
5. **`white-space: nowrap`** - prevents text wrapping during expansion
6. **`pointer-events: none/auto`** - controls interactivity during transition

---

## Browser Support Notes

- **backdrop-filter**: Supported in modern browsers (Chrome 76+, Safari 9+, Firefox 103+)
- **-webkit-backdrop-filter**: Required for Safari support
- **Fallback**: If backdrop-filter isn't supported, the semi-transparent background still works

---

## Customization Options

### Adjust Width
```css
/* Desktop */
.search-container.search-active .search-form {
  width: 400px; /* Change to desired width */
}

/* Mobile */
@media screen and (max-width: 768px) {
  .search-container.search-active .search-form {
    width: 280px; /* Change to desired width */
  }
}
```

### Adjust Height
```css
.search-input {
  height: 44px; /* Change height */
  line-height: 44px; /* Must match height */
}
```

### Adjust Blur Intensity
```css
.search-input {
  backdrop-filter: blur(20px); /* Increase for more blur */
  -webkit-backdrop-filter: blur(20px);
}
```

### Adjust Opacity
```css
.search-input {
  background: rgba(0, 0, 0, 0.6); /* Darker (increase opacity) */
}
```

---

## Complete Standalone Example

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Container */
    .search-container {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow: visible;
      z-index: 10;
    }

    /* Form - Expandable */
    .search-form {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      min-width: 0;
      max-width: 300px;
      opacity: 0;
      overflow: visible;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                  opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      z-index: 10;
      white-space: nowrap;
    }

    .search-container.search-active .search-form {
      width: 300px;
      min-width: 300px;
      opacity: 1;
      pointer-events: auto;
    }

    /* Input - Glassy */
    .search-input {
      width: 100%;
      height: 38px;
      padding: 0 1rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #ffffff;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s ease, background 0.2s ease;
      line-height: 38px;
      box-sizing: border-box;
    }

    .search-input::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }

    .search-input:focus {
      border-color: rgba(255, 255, 255, 0.4);
      background: rgba(0, 0, 0, 0.5);
    }

    /* Button */
    .search-toggle {
      width: 38px;
      height: 38px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div class="search-container">
    <form class="search-form" action="/search" method="get">
      <input type="search" name="q" class="search-input" placeholder="Search" autocomplete="off">
    </form>
    <button type="button" class="search-toggle" aria-label="Search" aria-expanded="false">
      🔍
    </button>
  </div>

  <script>
    // JavaScript from above
  </script>
</body>
</html>
```

---

## Summary

**Key Features:**
- ✅ Expands from 0px to 300px (250px on mobile) when clicked
- ✅ Expands leftward from right-anchored button
- ✅ Glassy effect with backdrop blur (12px)
- ✅ Smooth 0.3s transition animation
- ✅ Auto-focuses input when opened
- ✅ Closes on outside click or Escape key
- ✅ Responsive design (smaller on mobile)

**Dimensions:**
- Input: 38px height × 300px width (desktop) / 250px (mobile)
- Button: 38px × 38px
- Border radius: Fully rounded (9999px)
- Blur: 12px backdrop-filter


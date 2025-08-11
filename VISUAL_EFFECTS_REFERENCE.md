# Visual Effects System Reference

This document details all visual effects in the Panel Pop game, including what triggers them and what the player sees.

## Overview

The visual effects system provides feedback for all major game events through particles, popups, screen shake, and visual indicators. All effects are performance-optimized with object pooling and run at 60 FPS.

## Particle Effects

### Block Explosion Particles
**Trigger:** When blocks are matched and enter the EXPLODING state
**Effect:** 
- 8 colorful particles shoot outward from each matched block
- Particles match the color of the exploded block
- Directional velocity with upward bias and gravity physics
- 30-50 tick lifetime with fade-out animation
- Size varies randomly (6-10 pixels)

**Visual Impact:** Satisfying "pop" effect when blocks disappear

### Match Flash Particles  
**Trigger:** Simultaneously with block explosion particles
**Effect:**
- 12 bright particles in a circular pattern
- Colors are 1.5x brighter than normal block colors
- Faster, shorter-lived than explosion particles (20-30 ticks)
- No gravity - spreads outward then fades
- Smaller size (3-5 pixels)

**Visual Impact:** Brief bright flash that highlights the match location

### Chain Effect Particles
**Trigger:** When chain counter > 1 (sequential matches from falling blocks)
**Effect:**
- 6 golden particles per matched block position
- Color transitions from gold to red based on chain length
- Strong upward velocity (3+ pixels per tick)
- Gravity physics causes arc trajectory
- 40-60 tick lifetime
- Larger size (4-7 pixels)

**Visual Impact:** Dramatic golden shower effect for high-value chains

### Garbage Transformation Particles
**Trigger:** When garbage blocks enter TRANSFORMING state
**Effect:**
- 2-20 gray particles (based on garbage size)
- Circular spread pattern with moderate speed
- 40-60 tick lifetime with gravity
- Gray color (#888888)
- Medium size (4-6 pixels)

**Visual Impact:** Visual indication of large garbage blocks breaking apart

## Popup System

### Chain Popups
**Trigger:** Chain counter ≥ 2
**Format:** `"2x CHAIN"`, `"3x CHAIN"`, etc.
**Colors:**
- Chain 2-2: Green (#00ff00)
- Chain 3-4: Yellow (#ffff00)  
- Chain 5-6: Orange (#ff8800)
- Chain 7-8: Red (#ff4400)
- Chain 9+: Magenta (#ff00ff)

**Animation:**
- Appears 20 pixels above match center
- Grows to 1.4x size in first 20% of lifetime
- Moves upward with decreasing velocity
- Shrinks in final 20% of lifetime
- 90 + (chainLength × 5) ticks duration
- Font size: 20 + (chainLength × 2) pixels (max 32)

**Visual Impact:** Clear indication of chain achievement with escalating drama

### Combo Popups
**Trigger:** Multiple simultaneous matches (combo size ≥ 2)
**Format:** `"4 COMBO"`, `"8 COMBO"`, etc.
**Colors:**
- Combo 2-4: Cyan (#00ffff)
- Combo 5-8: Light Green (#44ff44)
- Combo 9-12: Light Yellow (#ffff44)
- Combo 13+: Light Red (#ff4444)

**Animation:**
- Appears 10 pixels above match center (or +25 if chain popup present)
- Similar growth/shrink animation to chains
- 75 + (comboSize × 3) ticks duration
- Font size: 18 + comboSize pixels (max 28)
- 0.9x scale relative to chain popups

**Visual Impact:** Recognition of simultaneous matching skill

### Score Popups
**Trigger:** Score increase from matches
**Format:** `"+1250"`, `"+500"`, etc.
**Color:** Gold (#ffd700)
**Animation:**
- Appears 10 pixels below match center
- Moves upward with fade
- 60 tick duration
- 16 pixel font size
- 0.8x scale (smaller than other popups)

**Visual Impact:** Immediate score feedback

### Special Event Popups
**Trigger:** Game state changes
**Examples:**
- `"DANGER!"` (panic mode start) - Red color, large font (24px)
- `"GAME OVER"` (game end) - Red color, large font
- `"LEVEL X"` (level up) - Green color, large font

**Animation:**
- 120 tick duration (2 seconds)
- 1.2x scale
- Prominent positioning at screen center
- Font size: 24 pixels

**Visual Impact:** Major game state announcements

## Screen Shake Effects

### Chain-Based Shake
**Trigger:** Chain counter ≥ 2
**Intensity & Duration:**
- Chain 2-3: 1 pixel intensity, 15 ticks
- Chain 4-5: 2 pixel intensity, 25 ticks  
- Chain 6-7: 4 pixel intensity, 35 ticks
- Chain 8-10: 6 pixel intensity, 45 ticks
- Chain 11+: 8 pixel intensity, 60 ticks

**Pattern:**
- Frequency: 12 + chainLength Hz
- Dampening: 0.92 (gradual reduction)
- X/Y sine wave movement with random variation

**Visual Impact:** Escalating camera shake for longer chains

### Combo-Based Shake  
**Trigger:** Combo size ≥ 4
**Intensity & Duration:**
- Combo 4-6: 1.5 pixel intensity, 20 ticks
- Combo 7-10: 3 pixel intensity, 30 ticks
- Combo 11-15: 5 pixel intensity, 40 ticks
- Combo 16+: 7 pixel intensity, 50 ticks

**Pattern:**
- Frequency: 8 + (comboSize × 0.5) Hz
- Dampening: 0.94 (gentler than chain shake)

**Visual Impact:** Reward for creating large simultaneous matches

### Garbage Transformation Shake
**Trigger:** Large garbage blocks transforming
**Intensity:** 0.5 × garbageSize pixels (max 4)
**Duration:** 5 × garbageSize ticks (max 30)
**Pattern:**
- Low frequency: 6 Hz
- High dampening: 0.96
- Subtle shake for garbage events

**Visual Impact:** Indicates significant board changes from garbage

### Panic Mode Shake
**Trigger:** Panic mode active (blocks at row 9+)
**Intensity:** 0.5 pixels (continuous)
**Duration:** 30 ticks, constantly renewed
**Pattern:**
- High frequency: 20 Hz  
- High dampening: 0.98
- Creates tension without being distracting

**Visual Impact:** Subtle indication of dangerous game state

## Visual Feedback Systems

### Warning Indicators
**Trigger:** Any block present in top visible row (row 11)
**Effect:**
- Red translucent overlay (80% opacity) behind affected columns
- Blinking animation using sine wave (0.2 Hz frequency)
- Opacity varies from 0.3 to 0.7
- Color intensifies in panic mode (bright red #ff0000)

**Visual Impact:** Clear danger indication for columns near game over

### Match Flash Effects
**Trigger:** Block matches detected
**Effect:**
- White additive-blended plane (40x40 pixels) at match position  
- 10 tick duration with fade-out
- Grows from 1.0x to 1.1x scale during flash
- Z-position 5 (above all other elements)

**Visual Impact:** Brief bright flash highlighting successful matches

### Grid Visual Changes
**Trigger:** Panic mode activation
**Effect:**
- Grid background changes from gray (#222222) to dark red (#440000)
- Opacity increases from 0.3 to 0.4
- Grid lines maintain normal color but appear more prominent

**Visual Impact:** Atmospheric change indicating high-pressure gameplay

### Block State Visual Effects
**Trigger:** Various block states
**Effects:**
- **Chain blocks:** +0.2 opacity boost, subtle glow
- **Floating blocks:** Continuous subtle bobbing animation
- **Swapping blocks:** Slide animation left/right
- **Exploding blocks:** Scale up then fade out
- **Warning area blocks:** Red emissive glow with blinking pattern

**Visual Impact:** Clear state communication through visual language

## Performance Specifications

### Object Pooling
- **Particles:** 200 pre-allocated, recycled when expired
- **Popups:** 50 pre-allocated, recycled when expired
- **Memory:** Fixed allocation prevents garbage collection spikes

### Frame Rate Targets
- **Target:** 60 FPS maintained with all effects active
- **Optimization:** Efficient THREE.js rendering with minimal draw calls
- **Fallbacks:** Automatic effect reduction if performance drops

### Debug Information
**Access:** Press F3 to toggle debug overlay
**Display:** `Effects: ON | Particles: 12/200 | Popups: 3/50 | Shake: 2.1 (15t)`
- Shows real-time effect counts
- Indicates screen shake intensity and remaining duration
- Performance monitoring for FPS and frame time

## Effect Combinations & Synergies

### High Chain + Large Combo
When both chain and combo occur simultaneously:
- Both popup types appear (chain popup higher)
- Screen shake uses the higher intensity value
- Particle effects combine (explosion + chain particles)
- Maximum visual impact for exceptional plays

### Panic Mode + Chain Reaction
During panic mode chain reactions:
- Enhanced warning indicator intensity
- Continuous panic shake + chain shake overlay
- Brighter particle colors due to danger state
- "DANGER!" popup may appear with chain popups

### Garbage + Match Combo
When garbage transforms during active matches:
- Gray transformation particles mix with colored match particles  
- Multiple screen shake sources may overlap
- Complex visual scene representing board chaos

## Customization Options

The effects system supports configuration through `EffectsConfig`:
- `enableParticles`: Toggle all particle effects
- `enablePopups`: Toggle all popup displays  
- `enableScreenShake`: Toggle camera shake effects
- `particleCount`: Adjust particle pool size (default 200)
- `maxPopups`: Adjust popup pool size (default 50)

All effects can be disabled individually for accessibility or performance preferences while maintaining gameplay functionality.
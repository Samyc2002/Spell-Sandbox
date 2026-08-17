# Rules for Compiling the Spells in the Sandbox

## Basic Rules

Spells are comprized of three main elements:

1. **Sigil**: A sigil, located in the center of a glyph, reflects the element of the spell. There are five main types of sigil: [earth](Assets/Sigils/Earth.webp), [air](Assets/Sigils/Air.webp), [water](Assets/Sigils/Water.webp), [fire](Assets/Sigils/Fire.webp), and [light](Assets/Sigils/Light.webp). Sometimes, a Sigil is not required when certain Signs are used (explained later).
2. **Signs**: Signs determine the form in which the element of the spell manifests. Signs are arranged around the central sigil, in either radial or bilateral symmetry, though asymmetrical signs still make valid spells, though sometimes unstable. Occasionally, signs can take the place of a sigil, occupying the center of the glyph. The types of signs are as follows:
   1. [Column](Assets/Signs/Column.webp): Column causes the magic of its glyph to manifest in a column or beam above the glyph. If the signs aren't balanced (radial symmetry doesn't affect this), the spell will manifest in the direction with the most signs[1]. The shorter line on the sign typically faces outwards
   2. [Dispersion](Assets/Signs/Dispersion.webp): Dispersion causes the magic of its glyph to pour or "disperse" out. It has many similarities to column, with it essentially being a column that just leaks its magic out instead of shooting or beaming it in a certain direction.
   3. [Levitation](Assets/Signs/Levitation.webp): Levitation causes the spell's magic to float above the glyph, or causes the movement of the object it is drawn on. If the latter, the movement depends on which direction the signs point. The pointed, arrow-like side of the sign typically faces inwards.
   4. [Pull](Assets/Signs/Pull.webp): Pull causes anything that is the same as its magic (water, air, fire, etc) to be pulled towards the glyph when the arrow portion of the sign is pointing inwards, and will also cause it to be pulled in in a twisting motion if the signs are angled. It is likely that if the sign is inverted, it would result in a push rather than a pull.
   5. [Crush](Assets/Signs/Crush.webp): Crush will cause objects to disintegrate or (when reverted) to come back together, at least when paired with an earth sigil (though only temporarily).
   6. [Float](Assets/Signs/Float.webp): Float will make the object it is drawn on float in midair, regardless of gravity. This can be considered a more controlled version of Levitation.
   7. [Direction](Assets/Signs/Direction.webp): Direction can influence the direction in which its magic manifests. For example, if all direction signs on a spell point forwards, the magic will shoot forwards. If all of the signs point inwards, the magic will shoot up. If all the signs point outwards, the magic will shoot outwards. Interestingly, if direction signs are arranged so that they are pointing towards one another, the magic will pour only from the space between the direction signs
   8. [Convergence](Assets/Signs/Convergence.webp): Convergence causes the magic of its spell to become more focused, centered down to a single point. It can also make loose particles become more rigid. One of the triangle's points is typically seen pointing inwards.
   9. [Collection](Assets/Signs/Collection.webp): Collection will collect material (and possibly magic) located above and around the glyph, allowing it to be used by the spell. The open side is typically seen facing inwards.
   10. [Radial](Assets/Signs/Radial.webp): Radial lets two sigil's effects to be added together, causing their effects to combine. For example, if fire and wind is combined, we get heat. If water and fire are combined, we get steam, if water and wind are combined, we get mist and so on. However, not all sigils can be combined, for example, Water and Light.
   11. [Bolt](Assets/Signs/Bolt.webp): Bolt causes the magic of its spell's sigil to manifest in the form of bolts. When paired with a directional sign (to control the direction) bolts can be shot with dangerous speed.
   12. [Billowing](Assets/Signs/Billowing.webp): Billowing converts material into a fluffy cloud that is apparently extremely comfortable to sit on. Collection is needed to collect and convert certain materials into clouds, but there seem to be some materials that cannot be converted. Similar to repetition, billowing can take the place of a sigil within a spell.
   13. [Repetition](Assets/Signs/Repetition.webp): Repetition continually resets objects affected by the spell to their previous state, essentially rewinding time. This sign can often take the place of a sigil within a spell, and may even be one itself.
   14. [Weave](Assets/Signs/Weave.webp): The weave sign (also known as ribbon) can turn solid objects affected by the spell into long, flexible ribbons upon contact with the glyph. This sign is supposed to surround the central sigil.
   15. [Enlarge](Assets/Signs/Enlarge.webp): Enlarge can either affect the object it is written on. It causes objects to either grow (corners point outwards) or shrink (corners point inwards). A sign may or may not be needed, but it would have to be placed in the center regardless.
   16. [Rain](Assets/Signs/Rain.webp): Rain generates the magic of its spell in a way similar to rainfall down within the range of its immediate area. This sign is meant to surround the central sigil, which is placed in the empty space in its center.
   17. [Bird](Assets/Signs/Bird.webp): Bird causes a bird-like projection of the glyph's magic to be generated and fly around for a while. The central sigil should be placed within this sign.
3. **Ring**: The ring is a circle that encloses the sigil and signs of a spell. A spell will only activate if its ring is complete.

## Advanced Spell Systems

### Linked Spells

When two spells are connected by a line, their effects will link together, and if both spells are identical or similar, their power will increase. Due to this phenomenon, if several small, identical spells are linked together, it is possible to make the spells more powerful than a large spell that takes up the same amount of space, allowing for very powerful spells to be drawn on small areas.

### Reversed Signs

If a sign is flipped around, it will produce an effect opposite to the one it produces normally. In addition to this, if two spells which are identical except that one is normal and one is reversed, the spells will cancel out one another’s effects, negating their magic.

### Spell Toggling

As a spell will only activate when it’s ring is closed, it is possible to toggle spells on and off by completing and disconnecting their ring. To do this, it is necessary to draw the spell in two different parts on two separate objects. When the two halves are touched together, the ring will be completed and the spell will turn on, turning off as soon as the halves are separated.

### Nested Glyphs

It is possible to have spells enclosed within one another, allowing their effects to combine. This technique can be used to boost the power of spells, quickly change part of a spell's effect without redrawing it entirely, or to create much more sophisticated and complex spells than otherwise possible. The spells that are nested inside only activate once the outermost ring is complete.

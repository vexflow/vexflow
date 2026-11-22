// Instrument, edition, and application lessons. Each study follows the text that explains it.
export function featureLessons(lesson) {
  return [
    lesson(
      'lead-sheets',
      'tutorial',
      'Lead sheets, chord symbols, and lyrics',
      'Setting words and chord changes to a melody.',
      `<p>A lead sheet gives a singer and an accompanist enough information to perform from the same staff. The singer follows the notes and syllables, while the accompanist reads a chord name such as Cmaj7 and chooses a voicing. In EasyScore you can attach both a lyric and a chord symbol to the note where the change takes place.</p>
<h2>Place the words and harmony</h2>
<p>The first melody has two dotted quarter notes in 6/8, each taking three of the six eighths in the measure. The word “Daylight” divides into two syllables, with “Day” on C and “light” on G. Above that second attack, G7/B asks the accompanist for a G dominant seventh chord with B as its bass.</p>
<div data-example="sung-phrase"></div>
<p>Find <code>id="light"</code> in the note string, then look for the same name in <code>verses</code> and <code>chords</code>. If you change G4 to A4, the syllable still belongs to the second note and the chord still reads G7/B. To change the accompaniment, edit the harmony entry attached to that ID.</p>
<p>Each inner array in <code>verses</code> provides another line of words. The <code>hyphenAfter</code> flag joins syllables that fall on separate attacks. To sing two syllables on one attack, replace the first entry with <code>{ note: 'day', text: 'la', elideWith: 'mi' }</code> and look for the undertie beneath C.</p>
<h2>Choose how to specify a chord symbol</h2>
<p>In the second study, compare the size of the first chord’s root and major-seventh suffix with the raised flat ninth on the second chord. The control changes the first root, giving you a way to see how the components sit together as the letter changes.</p>
<div data-example="chord-symbols"></div>
<p>When your app needs to transpose a lead sheet, use a structured <code>harmony</code> entry as in the first example. That gives it separate pitch names for the root and slash bass. Literal text works for instructions such as <code>N.C.</code>, where the accompanist is being asked to play no chord.</p>`,
      'Change the bass of G7/B to D and add a second inner array in verses with “Sing” and “here” under “day” and “light”. Check the bass letter above the second note and the alignment of the two verses below it.',
      ['composition', 'performing-parts'],
      ['repo:docs/text-and-lyrics.md', 'repo:docs/chord-symbols.md']
    ),
    lesson(
      'keyboard',
      'tutorial',
      'Keyboard staves, pedals, and octave lines',
      'Writing a piano part across two staves.',
      `<p>A keyboard score usually places the upper register on a treble staff and the lower register on a bass staff, with a brace joining them into a grand staff. The two staves share a timeline, which allows a pianist to see which notes sound together even when a melody moves between the staves.</p>
<h2>Write one voice for each hand</h2>
<p>In the first measure the upper voice begins on C5 while the lower voice begins on C3. Each plays two half notes, so you can read vertically on beats one and three to find both hands’ pitches. Both calls to <code>addStave()</code> use the same system, allowing VexFlow to format those simultaneous attacks together.</p>
<div data-example="grand-staff"></div>
<h2>Move a note into the other staff’s register</h2>
<p>In the next example the upper voice descends from G4 to E3. The lower voice sustains C3 through both notes. Writing E3 on the bass staff makes the low pitch easier to read, even though it is still the second half note of the upper voice.</p>
<div data-example="cross-staff-line"></div>
<p>Find the entry for E3 inside the upper voice. Its <code>stave: 'lower'</code> field identifies the staff on which to print it, and <code>clef: 'bass'</code> gives it the correct vertical position. If you transferred the event into the lower voice’s array instead, that voice would have a whole note plus an extra half note and the upper line would be incomplete.</p>
<h2>Show how long to use the pedal or play in octaves</h2>
<p>In the final passage the <em>8va</em> line tells the pianist to play the phrase an octave above its written pitches. The bracket beneath the music indicates when to use the sustain pedal, with a notch at G for a release and immediate retake.</p>
<div data-example="pedal-octave"></div>
<p>The example puts that notch at a single attack by listing G twice in the pedal sequence. Change both occurrences of <code>notes[2]</code> to <code>notes[1]</code> to move the pedal change under E. The octave line still follows its own endpoints over the full phrase.</p>`,
      'Move the pedal change from the third note to the second and compare its new position with the octave bracket above the staff.',
      ['polyphony', 'structured-composition'],
      ['repo:docs/easyscore.md']
    ),
    lesson(
      'modern-keys',
      'tutorial',
      'Microtones and custom key signatures',
      'Writing microtonal accidentals and nonstandard key signatures.',
      `<p>Some scores use pitches between the semitones of conventional sharp and flat notation, or require a key signature specific to an edition. VexFlow can attach an accidental to an individual head or place an ordered set of signs beside a clef, depending on how the performer should read the passage.</p>
<h2>Mark an individual pitch</h2>
<p>Read the four different signs in the first study, each just before its notehead. The example supplies one accidental code per note, so copying the first code, <code>'+'</code>, into the second position gives D the same sign that appears on C.</p>
<div data-example="microtones"></div>
<p>Compare the shape and vertical position of those two signs. The code you edited describes a written accidental. If your application also plays this music, its playback code needs the intended tuning and the corresponding interpretation of those written pitches.</p>
<h2>Specify the signs for an edition</h2>
<p>The next staff has a flat at G4 followed by a sharp at E4. Each entry in <code>signs</code> gives a sign type and a written pitch, and the order of the entries determines how they appear from left to right. Try reversing the entries while keeping the two half notes in their original order.</p>
<div data-example="written-signs"></div>
<p>The sharp should now appear first in the signature, still at the position of E4. The melody gets its pitches from <code>Gb4/h, E#4/h</code>, so you can edit the signature’s arrangement independently of the notes.</p>
<p>For several pieces that use the same signature, <code>KeySignaturePresets</code> lets you give that particular set of signs a name. The illustrated makam example shows a Sabâ signature and its placement across a change of clef. Use the pitch positions and signs chosen for the edition you are preparing.</p>`,
      'Move one sign up an octave, then change the order of the signs. Compare their heights on the staff with the order in which the player encounters them.',
      ['composition-policies', 'engraving-570'],
      ['repo:src/keysignature.ts']
    ),
    lesson(
      'chord-frames',
      'tutorial',
      'Fretboard diagrams, voicings, and right-hand technique',
      'Guitar chord fingerings and strumming directions.',
      `<p>A guitarist reading a C-major chord symbol may be able to play it in several positions on the neck. A chord frame shows the player which strings to use and where to place the fretting fingers, while a stroke marking can specify what the strumming hand does at the same beat.</p>
<h2>Read two fingerings for C major</h2>
<p>The first diagram shows an open-position C chord in standard tuning. Some strings can ring without being stopped at a fret. In the third-position diagram, a barre lets one finger stop several strings at the same fret. Look for that connection on the grid and compare it with the individual dots in the open position.</p>
<div data-example="guitar-frames"></div>
<p>The example asks <code>FretDiagram.lookupVoicing()</code> for a root, a tuning, and a named voicing. In the resulting fret array the lowest string comes first, zero means an open string, and <code>'x'</code> marks a muted string. If there is no registered voicing for a requested tuning, you can supply the fret positions used in your own arrangement.</p>
<p>Set <code>orientation</code> to <code>'horizontal'</code> to put the nut on the left. Follow the barre and the open strings through the change of orientation. For a different instrument, such as a banjo with a short fifth string, use that instrument’s actual tuning and string layout when choosing positions.</p>
<h2>Specify a strum</h2>
<p>A flamenco <em>rasgueado</em> uses the fingers to articulate a strum. The next study identifies the fingers with letters and uses <em>golpe</em> for a tap on the guitar body. Read the legend above the staff to establish which direction each arrow represents.</p>
<div data-example="rasgueado-golpe"></div>
<p>Find one attack in both standard notation and tab, then switch the arrow convention. Comparing the arrows with the legend shows how two conventions can describe the same finger order and direction of travel across the strings.</p>`,
      'Display the two frames horizontally and locate the barre in each. When you return them to their original orientation, how can you tell which strings the barre covers?',
      ['easy-tablature', 'tab'],
      ['repo:src/fretdiagram.ts', 'repo:docs/vf6/m8-guitar.md']
    ),
    lesson(
      'drum-parts',
      'tutorial',
      'Drum kit, single-line percussion, and sticking',
      'Instrument maps and sticking patterns for percussion.',
      `<p>A drum part combines rhythmic notation with instructions about which instrument to strike and, where it matters, which hand to use. On a kit staff, a head’s shape and vertical position can identify a drum or cymbal. A part for one snare drum can use a single line and put the right- and left-hand assignments directly beneath it.</p>
<h2>Identify the instrument at each attack</h2>
<p>Choose <strong>percussion</strong> in the first example’s family control and compare the noteheads on the staff. A cross and an ordinary head can distinguish two sounds that occur at the same beat. If an arrangement uses several such conventions, a legend gives the player a reference for this particular kit.</p>
<div data-example="easyscore-families"></div>
<p>A <code>PercussionMap</code> lets the application build notes from names such as snare and hi-hat. When both instruments are struck together, their mapped heads can share one stem and one duration. Striking them in succession would require separate entries in the voice.</p>
<h2>Write a paradiddle</h2>
<p>The snare study contains eight eighth notes in two groups of four. Under the first beam, the letters R L R R specify a paradiddle beginning with the right hand. The second group reverses the pattern to L R L L, so the drummer finishes each group with two strokes from the same hand.</p>
<div data-example="snare-sticking"></div>
<p>The program uses <code>hands</code> to create a note for each stroke, then pairs each hand assignment with its note in <code>addStickingLine()</code>. This association lets the sheet align the letters after it has measured the notes. If you change the fourth R to L, the new hand assignment should appear under the fourth head while its rhythm and staff position stay the same.</p>`,
      'Give the player alternating R and L hand assignments and follow them along the beam groups. Where does each hand fall in the original rhythm?',
      ['beaming', 'measures'],
      ['repo:docs/sheets-and-themes.md']
    ),
    lesson(
      'wind-parts',
      'tutorial',
      'Flute keys, accordion registers, and pipe embellishments',
      'Instrument-specific signs for notes and chords.',
      `<p>Flute, accordion, and bagpipe writing sometimes calls for more information than a pitch and duration can convey. A flute diagram can show which key moves during a trill, an accordion register sign selects the sounding reeds, and a bagpipe embellishment gives the grace notes that lead into an attack. Each instruction belongs at the note where the player uses it.</p>
<h2>Indicate a flute trill key</h2>
<p>Both D half notes in the first example have the same starting fingering. Read the diagram as two groups of three keys, one for each hand, with filled circles showing the closed keys. The second diagram adds the movement required during the trill.</p>
<div data-example="flute-keys"></div>
<p>In <code>setTrillKey()</code>, R1 starts open and alternates with closed. Change R1 to R2, which is also open in the base fingering, and compare the right-hand group in the two diagrams. Only the second diagram should identify a moving key.</p>
<h2>Select an accordion register</h2>
<p>An accordion register determines which reed ranks sound as the player holds a note or chord. The first chord below uses one middle rank, while the second adds low and high ranks. Their pitches are identical, so compare the dots in the two register signs to read the change in sound.</p>
<div data-example="accordion-ranks"></div>
<p>Removing <code>high: true</code> from the second register changes the sign above the chord while leaving the three written heads in place.</p>
<h2>Add a Highland pipe embellishment</h2>
<p>A grip and a taorluath are named patterns of finger movements that lead into a principal note. In the last example VexFlow supplies the appropriate small notes for each name and attaches the group to the following half note.</p>
<div data-example="piping-graces"></div>
<p>Count the two large heads to read the duration of the bar, then compare the small sequences to see how the piper approaches each pitch. Attaching each pattern as a group keeps its place in the phrase when the music is respaced.</p>`,
      'Move the flute trill to another open key and check the diagram against your new fingering. In the accordion example, remove the low rank from the second chord and identify the change in its register symbol.',
      ['easy-families', 'instrument-signs'],
      ['repo:src/flutefingering.ts', 'repo:src/accordionregister.ts', 'repo:src/gracenotegroup.ts']
    ),
    lesson(
      'early-music',
      'tutorial',
      'Four-shape notation and figured bass',
      'Reading scale degrees and intervals from a score.',
      `<p>Four-shape singing and figured bass give the performer two different kinds of pitch information. In a four-shape edition the outline of the notehead identifies a syllable from the scale. In a continuo part the figures underneath a bass note indicate intervals the accompanist can play above it.</p>
<h2>Apply four shapes to a scale</h2>
<p>The first example runs from C5 up to C6. The major scale follows the syllables fa, sol, la, fa, sol, la, mi, fa, each syllable having its own head shape. Compare C with F, the fourth note of the scale. They occupy different staff positions but both use the fa shape.</p>
<div data-example="four-shapes"></div>
<p>The pitches come from <code>score.notes()</code>, while <code>applyFourShape('C', notes)</code> identifies C as the tonic, or first degree of the scale. To move the passage to G major, write G, A, B, C, D, E, F-sharp, G and change the tonic to G. The shapes should repeat in their original order because the new melody goes through the same scale degrees.</p>
<h2>Read the figures above a bass pitch</h2>
<p>The figures themselves appear under the staff, but their numbers are counted upward from the sounding bass. Count C as one and you reach E at the third and A at the sixth. The stack of 6 over 3 at the first C gives the accompanist those intervals without specifying a complete realization for the upper voices.</p>
<div data-example="figured-line"></div>
<p>The line following the 6 carries the upper figure through the next attack, and a new stack of 5 over 3 begins at the third. In the code the upper 6 has both a starting note and an <code>extendTo</code> note. Moving that endpoint changes the length of its continuation independently of the lower row.</p>`,
      'Transpose the four-shape example to G major, setting the tonic to G and including F-sharp in the written scale. Which shape now represents G?',
      ['historical-editions', 'modern-keys'],
      ['repo:docs/white-mensural.md', 'repo:docs/german-lute.md', 'repo:docs/kievan-notation.md']
    ),
    lesson(
      'historical-editions',
      'tutorial',
      'Chant, lute tablature, and historical editions',
      'Writing chant syllables and lute courses.',
      `<p>Chant and lute tablature each organize music around a unit familiar to the performer. A chant singer reads one syllable together with its group of pitches, while a lutenist reads the course and fret that produce each sound. VexFlow provides notation for both, including the four-line chant staff and the letters used in French lute tablature.</p>
<h2>Group the chant by syllable</h2>
<p>On the chant staff below, the movable C clef shows which line represents middle C. Follow “Do” beneath its single square, then “mi” beneath the rising pair and “ne” beneath the falling pair. A group sung to one syllable is called a <strong>neume</strong>, and the layout keeps that group together with its text.</p>
<div data-example="chant-syllables"></div>
<p>Reverse the two pitches in the array for “mi” and follow the resulting shape. The singer now descends on that syllable. The example spaces these notes by syllable, without a time signature or measured bars to adjust.</p>
<h2>Identify a lute course and fret</h2>
<p>A course is a string or group of strings played together. In French lute tablature the line identifies the course and the letter identifies the fret. The first three attacks in the next study remain on course 2, progressing from open through frets 1 and 2. The final sign represents an open bass course below the six ruled lines.</p>
<div data-example="lute-courses"></div>
<p>Changing the last entry from course 7 to course 8 at fret 0 changes the mark below the staff. German lute tablature uses another convention in which one sign represents the course and fret together on a staffless row. The illustrated editions below let you compare the two systems.</p>
<h2>Read other historical editions</h2>
<p>White mensural music has distinct written values including maxima, longa, and brevis. Vocal editions may mark measure boundaries between staves with a <em>mensurstrich</em>, leaving the sung lines uninterrupted. For examples of mensuration signs and the line and space forms used in Kievan notation, continue to the <a href="#lesson/early-notation">historical notation reference</a>.</p>`,
      'Reverse the two pitches on “mi” to make the neume descend. In the lute example, move the last open bass from course seven to course eight and compare the signs for those courses.',
      ['early-music', 'early-notation'],
      [
        'repo:src/chantphrase.ts',
        'repo:docs/german-lute.md',
        'repo:docs/white-mensural.md',
        'repo:docs/kievan-notation.md',
      ]
    ),
    lesson(
      'page-layout',
      'tutorial',
      'Lay out systems and printed pages',
      'Page dimensions, system breaks, and page turns.',
      `<p>When a score appears on a phone, you can give each row fewer measures so that the notes remain easy to read. A printed part has a fixed page size, and a musician needs enough time to turn the page. Both editions can use the same notes, but they call for different decisions about where the music continues.</p>
<h2>Fit measures to the screen</h2>
<p>A row of music is called a <em>system</em>. In the first editor the vertical bars in the note string divide the phrase into four measures. Reduce the row width and watch where the second system begins. The sheet keeps each measure together, so you can follow the phrase across the break by finding the same barline.</p>
<div data-example="sheet"></div>
<p>A narrower system can make the score taller. This is why the example formats the sheet before it measures the height and resizes the drawing surface. By the time it draws, it knows how much room all the systems need.</p>
<h2>Plan a page turn</h2>
<p>The printed example sets a two-flute duet on Letter paper. The margins determine how much of the page is available for music, while the title, subtitle, and footer identify the edition. A system break tells the reader to continue on a new row. A page break also tells them when to turn the page.</p>
<div data-example="paper-edition"></div>
<p>A number in <code>pageBreaks</code> identifies the first measure of the <em>new</em> page. With <code>pageBreaks: [2]</code>, the first page holds just the opening measure. Set <code>pageNumber</code> to 2 and you can check the turn by reading Flute 1’s first two notes on that page, D and G.</p>
<p>To place the turn later, try <code>[4]</code> and look at page two again. Both flutes now have just their final whole-note C to play. The editor scales a copy of the page for the preview so the printed edition keeps its physical dimensions. For examples with longer pieces, the <a href="https://vexflow.com/pdfs/">PDF gallery</a> includes complete scores and their source.</p>`,
      'Set pageBreaks to [3] and check both sides of the turn. Flute 1 should end the first page with D and G and begin the next with E and D.',
      ['performing-parts', 'measures'],
      ['repo:docs/vf6/m5.md', 'repo:src/publication.ts']
    ),
    lesson(
      'performing-parts',
      'tutorial',
      'Extract parts and condense a conductor score',
      'Individual flute parts and a condensed conductor score.',
      `<p>A flutist needs to see which notes to play, while a conductor also needs to see when the two flutes enter together and when their lines divide. You can prepare both views from the same duet by selecting the players and layout for each edition.</p>
<h2>Extract a flute part</h2>
<p>Each flute has an ID, a display name, and four measures of music. The part below selects Flute 2 with <code>staves: ['two']</code>. Look at the two half notes in the opening measure. The second flutist plays C on both beats one and three.</p>
<div data-example="flute-parts"></div>
<p>Change the selection to <code>['one']</code>. Flute 1 starts on the same C, but moves up to E on beat three. The title still says “Flute 2” because the example supplies it separately. Give the part its new title and consider where this player might have enough time for a page turn.</p>
<h2>Read both players on one staff</h2>
<p>The conductor edition lists both player IDs in <code>condense.players</code>. Follow the first measure again. The flutes enter in unison, so one pitch can represent both players. On beat three you can read Flute 1’s E above the C that Flute 2 repeats.</p>
<div data-example="condensed-duet"></div>
<p>By the last measure both flutes have returned to C, which they hold for the whole bar. Condensing changes what the conductor sees while preserving both lines for the individual parts. Other editorial choices can also belong to a particular view. A cue can quote another player’s entrance during a rest, for example, and an <em>ossia</em> can give one player an alternative version of a passage.</p>`,
      'Change the second flute’s opening C to B in both examples. Compare what the conductor sees on beat one with what the second flutist reads in the part.',
      ['page-layout', 'structured-composition'],
      ['repo:docs/vf6/m5.md', 'repo:src/publicationview.ts']
    ),
    lesson(
      'score-reading',
      'tutorial',
      'Score readers, redraw, and export',
      'Reading order, interactive selection, and score export.',
      `<p>A music reader needs to know when each note occurs and how to find it again after the score changes size. A note’s position on the screen can change whenever a measure wraps, so an application needs a way to identify the musical event independently of where it was drawn.</p>
<h2>Follow a note through the score</h2>
<p>The two half notes in this example have the IDs <code>start</code> and <code>end</code>. <code>ScoreNavigation</code> takes the composition and the laid-out staves and provides information about the events. Read the output alongside the music. Each entry includes a description and an <em>onset</em>, the amount of time that has elapsed before the note begins.</p>
<div data-example="score-reader"></div>
<p>Onsets here are fractions of a whole note. C begins at zero, and G begins at <code>1/2</code> because C lasts for half a whole note. If you shorten C to a quarter note and lengthen G to a dotted half, G begins at <code>1/4</code> and keeps the ID <code>end</code>. After the music wraps, an application can use that ID to restore a selection and the new hit regions to find the note on an SVG or Canvas surface.</p>
<h2>Draw the same music again</h2>
<p>An application may also need to change the appearance of the score while keeping the music and its layout. The next example calls <code>draw({ retain: true })</code> to keep the objects available. It clears the surface, changes the shared foreground color, and draws the score again.</p>
<div data-example="redraw"></div>
<p>Look at the second note alongside its neighbors. It has an explicit color of its own, which takes precedence over the shared setting. When you begin an entirely new score, <code>reset()</code> clears the queued objects and their local references. If you want to take the current drawing out of the application, <code>SVGContext.toSVG()</code> can produce a portable illustration using matching outline fonts for path-only export.</p>`,
      'Keep the IDs start and end, but give C a quarter note and G a dotted half. Use the onset in the output to check how much of the measure has elapsed when G begins.',
      ['measures', 'fonts-export'],
      ['repo:src/scorenavigation.ts', 'repo:docs/portable-svg.md', 'repo:docs/sheets-and-themes.md']
    ),
    lesson(
      'native-handoff',
      'tutorial',
      'From EasyScore to the native API',
      'Drawing and formatting a measure with the native API.',
      `<p>EasyScore has handled several drawing decisions throughout the tutorial, including how much space to give each note in a bar. When you need to control those decisions yourself, you can work directly with the renderer, stave, voice, and formatter. An empty staff is a good place to see what each step contributes.</p>
<h2>Draw the staff on a surface</h2>
<p>A <code>Renderer</code> connects a page element to a drawing backend. The example resizes the surface and gets a drawing context, then gives the stave its own position and width. The stave can draw its five lines, clef, and time signature as soon as it has that context.</p>
<div data-example="native-stave"></div>
<p>Change the stave’s vertical coordinate and run the example. The lines, clef, and time signature move together within the image. To change the size of the surrounding image, you would resize the renderer instead.</p>
<h2>Put a voice on the staff</h2>
<p>The next example fills a 4/4 measure with C, D, a rest, and a C major chord. Each is a <code>StaveNote</code>, including the rest. The chord has three keys but occupies a single quarter-note beat, just as it did when you wrote its pitches together in an EasyScore string.</p>
<div data-example="native-notes"></div>
<p>Follow the notes from <code>addTickables(notes)</code> through <code>formatToStave()</code> to <code>voice.draw()</code>. The voice collects the events and their durations, and the formatter uses those durations and the available width to position them. The draw call then has both a staff and a place on it for each note.</p>
<p>You can use these objects alongside EasyScore. The notes returned by EasyScore already expose their native methods, and <code>factory.EasyScore()</code> shares the factory’s drawing queue. Continue with the <a href="#lesson/native-lifecycle">Native API Guide</a> for worked examples of rendering, attaching modifiers, and formatting multiple voices.</p>`,
      'Move the first C up an octave without changing its duration, then narrow the stave. Compare the effect of the first edit on pitch with the effect of the second on spacing.',
      ['native-lifecycle', 'native-notes-lesson', 'formatting'],
      ['repo:docs/easyscore.md', 'repo:src/formatter.ts']
    ),
  ];
}

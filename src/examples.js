export const examples = [
  { id: 'orbit', title: 'Orbit study', filename: 'ORBIT.BAS', tag: 'GRAPHICS', description: 'A little geometry goes a long way.', source: `' ORBIT STUDY · a small experiment in circles
' Run it, then change the radius or the colors.
SCREEN 12
CLS

pi = 3.14159265359
cx = 320
cy = 240
radius = 150

' A quiet grid behind the orbits
FOR x = 0 TO 640 STEP 40
  LINE (x, 0)-(x, 480), 8
NEXT x
FOR y = 0 TO 480 STEP 40
  LINE (0, y)-(640, y), 8
NEXT y

' Twelve points, one shared center
FOR i = 0 TO 11
  angle = i * pi / 6
  x = cx + COS(angle) * radius
  y = cy + SIN(angle) * radius
  CIRCLE (x, y), 80, 11
  LINE (cx, cy)-(x, y), 3
  CIRCLE (x, y), 4, 14
NEXT i
CIRCLE (cx, cy), radius, 15
CIRCLE (cx, cy), 8, 14

PRINT "ORBIT STUDY / 12 circles / 640 x 480"
END` },
  { id: 'hello', title: 'Hello, world', filename: 'HELLO.BAS', tag: 'START HERE', description: 'Strings, input, and a first conversation.', source: `' Your first little program
CLS
PRINT "Hello from Bytewell."
PRINT
INPUT "What is your name? "; name$
PRINT "Nice to meet you, " + name$ + "!"
PRINT
FOR i = 1 TO 5
  PRINT i; " squared is "; i ^ 2
NEXT i
END` },
  { id: 'fibonacci', title: 'Fibonacci steps', filename: 'FIBONACCI.BAS', tag: 'LOOPS + WATCH', description: 'Step through a familiar sequence.', source: `' Press F8 to step. Watch a, b, and nextValue.
CLS
PRINT "A sequence, one step at a time"
PRINT "------------------------------"
a = 0
b = 1
FOR i = 1 TO 12
  PRINT i; "  -> "; a
  nextValue = a + b
  a = b
  b = nextValue
NEXT i
PRINT
PRINT "Try: PRINT a + b in Immediate."
END` },
  { id: 'guess', title: 'Guess the number', filename: 'GUESS.BAS', tag: 'INPUT + BRANCH', description: 'A complete, tiny guessing game.', source: `' INPUT pauses without freezing the editor.
CLS
secret = INT(RND * 20) + 1
guess = 0
tries = 0
PRINT "I picked a number from 1 to 20."
WHILE guess <> secret
  INPUT "Your guess? "; guess
  tries = tries + 1
  IF guess < secret THEN PRINT "A little higher."
  IF guess > secret THEN PRINT "A little lower."
WEND
PRINT "You found it in "; tries; " guesses!"
END` },
  { id: 'blocks', title: 'Color blocks', filename: 'BLOCKS.BAS', tag: 'PALETTE', description: 'Meet the sixteen-color drawing palette.', source: `' A playful 16-color test card
SCREEN 12
CLS
FOR c = 0 TO 15
  x = (c MOD 4) * 150 + 24
  y = INT(c / 4) * 110 + 24
  LINE (x, y)-(x + 140, y + 100), c, BF
  LINE (x, y)-(x + 140, y + 100), 15, B
NEXT c
PRINT "16 colors. Endless small experiments."
END` }
];

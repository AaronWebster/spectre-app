// Final verification that our fix matches the reference implementation exactly

const PI = Math.PI;

// Reference implementation (from problem statement - CORRECT)
function invRef(T) {
  const det = T[0] * T[4] - T[1] * T[3];
  return [
    T[4] / det, -T[1] / det, (T[1] * T[5] - T[2] * T[4]) / det,
    -T[3] / det, T[0] / det, (T[2] * T[3] - T[0] * T[5]) / det
  ];
}

function mulRef(A, B) {
  return [
    A[0] * B[0] + A[1] * B[3],
    A[0] * B[1] + A[1] * B[4],
    A[0] * B[2] + A[1] * B[5] + A[2],
    A[3] * B[0] + A[4] * B[3],
    A[3] * B[1] + A[4] * B[4],
    A[3] * B[2] + A[4] * B[5] + A[5]
  ];
}

// Our implementation WITH FIX (converts to/from gl-matrix format)
const { mat2d } = require('gl-matrix');

function toGLMatrix(T) {
  return [T[0], T[3], T[1], T[4], T[2], T[5]];
}

function fromGLMatrix(m) {
  return [m[0], m[2], m[4], m[1], m[3], m[5]];
}

function invFixed(T) {
  const glMatrix = toGLMatrix(T);
  const result = mat2d.create();
  mat2d.invert(result, glMatrix);
  return fromGLMatrix(result);
}

function mulFixed(A, B) {
  const glA = toGLMatrix(A);
  const glB = toGLMatrix(B);
  const result = mat2d.create();
  mat2d.multiply(result, glA, glB);
  return fromGLMatrix(result);
}

function compareArrays(a, b, name, tolerance = 1e-10) {
  let match = true;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > tolerance) {
      match = false;
      break;
    }
  }
  console.log(`${name}: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
  if (!match) {
    console.log('  Reference:', a);
    console.log('  Fixed:    ', b);
  }
  return match;
}

console.log('=== FINAL VERIFICATION ===\n');
console.log('Comparing our FIXED implementation with reference implementation:\n');

let allMatch = true;

// Test 1: Translation inverse
const trans = [1, 0, 5, 0, 1, 3];
const transInvRef = invRef(trans);
const transInvFixed = invFixed(trans);
allMatch &= compareArrays(transInvRef, transInvFixed, 'Test 1: Translation inverse');

// Test 2: Rotation inverse
const angle = PI / 4;
const c = Math.cos(angle);
const s = Math.sin(angle);
const rot = [c, -s, 0, s, c, 0];
const rotInvRef = invRef(rot);
const rotInvFixed = invFixed(rot);
allMatch &= compareArrays(rotInvRef, rotInvFixed, 'Test 2: Rotation inverse');

// Test 3: General matrix inverse
const general = [2, 1, 5, 3, 4, 7];
const generalInvRef = invRef(general);
const generalInvFixed = invFixed(general);
allMatch &= compareArrays(generalInvRef, generalInvFixed, 'Test 3: General matrix inverse');

// Test 4: Translation multiplication
const t1 = [1, 0, 2, 0, 1, 3];
const t2 = [1, 0, 5, 0, 1, 7];
const t12Ref = mulRef(t1, t2);
const t12Fixed = mulFixed(t1, t2);
allMatch &= compareArrays(t12Ref, t12Fixed, 'Test 4: Translation multiplication');

// Test 5: Rotation and translation multiplication
const rot2 = [c, -s, 0, s, c, 0];
const trans2 = [1, 0, 5, 0, 1, 3];
const rtRef = mulRef(rot2, trans2);
const rtFixed = mulFixed(rot2, trans2);
allMatch &= compareArrays(rtRef, rtFixed, 'Test 5: Rotation * Translation');

// Test 6: Complex composition
const m1 = [2, 1, 3, 1, 2, 5];
const m2 = [1, 3, 2, 2, 1, 4];
const m12Ref = mulRef(m1, m2);
const m12Fixed = mulFixed(m1, m2);
allMatch &= compareArrays(m12Ref, m12Fixed, 'Test 6: Complex multiplication');

console.log('\n' + '='.repeat(50));
if (allMatch) {
  console.log('✅✅✅ ALL TESTS PASS - FIX IS CORRECT! ✅✅✅');
} else {
  console.log('❌ SOME TESTS FAILED - FIX MAY BE INCORRECT');
}
console.log('='.repeat(50));

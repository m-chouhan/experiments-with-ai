const fs = require('fs');
var a = process.argv.slice(2);
var ai = null, sf = 'scores.json';
for (var i = 0; i < a.length; i += 2) {
  if (a[i] == '--ai') ai = a[i + 1];
  if (a[i] == '--scores') sf = a[i + 1];
}
var b = [['.', '.', '.'], ['.', '.', '.'], ['.', '.', '.']];
var lines = fs.readFileSync(0, 'utf8').split('\n');
if (lines[lines.length - 1] === '') lines.pop();
var li = 0, t = 'X', done = false, res = '';

function w(x) {
  for (var i = 0; i < 3; i++) {
    if (x[i][0] != '.' && x[i][0] == x[i][1] && x[i][1] == x[i][2]) return x[i][0];
    if (x[0][i] != '.' && x[0][i] == x[1][i] && x[1][i] == x[2][i]) return x[0][i];
  }
  if (x[1][1] != '.' && ((x[0][0] == x[1][1] && x[1][1] == x[2][2]) || (x[0][2] == x[1][1] && x[1][1] == x[2][0]))) return x[1][1];
  return null;
}

while (!done) {
  var r, c;
  if (t == ai) {
    var o = t == 'X' ? 'O' : 'X', found = false;
    for (var p = 0; p < 2 && !found; p++) {
      var m = p == 0 ? t : o;
      for (var y = 0; y < 3 && !found; y++) for (var x = 0; x < 3 && !found; x++) {
        if (b[y][x] == '.') {
          b[y][x] = m;
          var ww = w(b);
          b[y][x] = '.';
          if (ww == m) { r = y; c = x; found = true; }
        }
      }
    }
    if (!found) {
      if (b[1][1] == '.') { r = 1; c = 1; found = true; }
      for (var y = 0; y < 3 && !found; y++) for (var x = 0; x < 3 && !found; x++) {
        if (b[y][x] == '.') { r = y; c = x; found = true; }
      }
    }
  } else {
    if (li >= lines.length) { res = 'INCOMPLETE'; break; }
    var parts = lines[li++].trim().split(/\s+/).map(Number);
    if (parts.length != 2 || !Number.isInteger(parts[0]) || !Number.isInteger(parts[1]) || parts[0] < 0 || parts[1] < 0 || parts[0] > 2 || parts[1] > 2 || b[parts[0]][parts[1]] != '.') {
      console.log('INVALID');
      continue;
    }
    r = parts[0]; c = parts[1];
  }
  b[r][c] = t;
  console.log(b.map(function (q) { return q.join(' '); }).join('\n'));
  var win = w(b);
  var full = true;
  for (var y = 0; y < 3; y++) for (var x = 0; x < 3; x++) if (b[y][x] == '.') full = false;
  if (win) { res = 'WINNER ' + win; done = true; }
  else if (full) { res = 'DRAW'; done = true; }
  else t = t == 'X' ? 'O' : 'X';
}

if (res == 'INCOMPLETE') {
  console.log('INCOMPLETE');
} else {
  console.log(res);
  var sc = { X: 0, O: 0, draws: 0 };
  try { sc = Object.assign(sc, JSON.parse(fs.readFileSync(sf, 'utf8'))); } catch (e) {}
  if (res == 'DRAW') sc.draws++; else sc[res.split(' ')[1]]++;
  fs.writeFileSync(sf, JSON.stringify(sc));
  console.log('SCORES X=' + sc.X + ' O=' + sc.O + ' draws=' + sc.draws);
}

import { Chess } from 'chess.js';
const validSquare = (square) => typeof square === 'string' && square.search(/^[a-h][1-8]$/) !== -1

const validPiece = (code) => typeof code === 'string' && code.search(/^[bw][KQRNBP]$/) !== -1

const fenToPieceCode = (piece) => piece.toLowerCase() === piece ? `b${piece.toUpperCase()}` : `w${piece.toUpperCase()}`

const pieceCodeToFen = (piece) => {
  const [color, code] = piece.split('')
  return `${color === 'w' ? code.toUpperCase() : code.toLowerCase()}`
}

const expandFenEmptySquares = (fen) => {
  return `${fen}`.replace(/8/g, '11111111')
  .replace(/7/g, '1111111')
  .replace(/6/g, '111111')
  .replace(/5/g, '11111')
  .replace(/4/g, '1111')
  .replace(/3/g, '111')
  .replace(/2/g, '11')
}

const squeezeFenEmptySquares = (fen) => {
  return `${fen}`.replace(/11111111/g, '8')
  .replace(/1111111/g, '7')
  .replace(/111111/g, '6')
  .replace(/11111/g, '5')
  .replace(/1111/g, '4')
  .replace(/111/g, '3')
  .replace(/11/g, '2')
}

const validFen = (fen) => {
  if (typeof fen !== 'string') return false
  const chunks = expandFenEmptySquares(fen.replace(/ .+$/, '')).split('/')
  if (chunks.length !== 8) return false
  if (chunks.find(e => !e || !e.length || e.length !== 8 || e.search(/[^kqrnbpKQRNBP1]/) !== -1)) return false
  return true
}

const validPosition = (pos) => {
  if (typeof pos !== 'object') return false
  return Object.entries(pos).every(([square, piece]) => validSquare(square) && validPiece(piece))
}

export const emptyFen = '8/8/8/8/8/8/8/8 w - - 0 1'

export const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export const cols = 'abcdefgh'.split('')

export const rows = '87654321'.split('')

export const fenToObj = (fen) => {
  let obj = {}
  if (fen === 'start') fen = startFen
  if (validFen(fen)) {
    let rind = 8
    fen.replace(/ .+$/, '').split('/').forEach(row => {
      let cind = 0
      row.split('').forEach(col => {
        if (col.search(/[1-8]/) !== -1) {
          cind = cind + parseInt(col, 10)
        } else {
          obj[`${cols[cind]}${rind}`] = fenToPieceCode(col)
          cind++
        }
      })
      rind--
    })
  } return obj
}

export const objToFen = (obj) => {
  if (!validPosition(obj)) return ''
  let fen = ''
  rows.forEach(row => {
    cols.forEach(col => {
      const piece = obj[`${col}${row}`]
      fen += piece ? pieceCodeToFen(piece) : '1'
    })
    if (row !== '1') fen += '/'
  })
  return squeezeFenEmptySquares(fen)
}

export const getAnimations = (oldPos = {}, newPos = {}) => {
  const prev = {...oldPos}, next = {...newPos}, add = [], mov = []
  Object.keys(next).forEach(key => {
    if (!next.hasOwnProperty(key) || !next[key]) delete next[key]
    if (prev.hasOwnProperty(key) && prev[key] === next[key]) {
      delete next[key]
      delete prev[key]
    }
  })
  const search = Object.entries(prev).filter(([key, val]) => key && val)
  Object.keys(next).forEach(to => {
    const index = search.findIndex(([_, val]) => val === next[to])
    if (index >= 0) {
      const [from, piece] = search[index]
      mov.push({from, to, piece})
      search.splice(index, 1)
      delete next[to]
      delete prev[from]
    } else {
      add.push({to, piece: next[to]})
      delete next[to]
    }
  })
  return {add, mov, rem: search.map(([from, piece]) => ({from, piece}))}
}

export const getPosition = (oldPos = {}, newPos = {}) => {
  const prev = {...oldPos}, next = {...newPos}, data = []
  Object.keys(next).forEach(key => {
    if (prev[key] === next[key]) {
      data.push({from: key, to: key, piece: next[key]})
      delete next[key]
      delete prev[key]
    }
  })
  const search = Object.entries(prev)
  Object.keys(next).forEach(key => {
    const index = search.findIndex(([_, val]) => val === next[key])
    if (index >= 0) {
      const [from, piece] = search[index]
      data.push({from, to: key, piece})
      search.splice(index, 1)
      delete next[key]
      delete prev[from]
    } else {
      data.push({from: key, to: key, piece: next[key]})
      delete next[key]
    }
  })
  return {data, captured: search.length ? true : false}
}

export const getPawnStructure = (fen) => {
  const obj = Object.entries(fenToObj(fen)).filter(([key, val]) => key && val && (val === 'wP' || val === 'bP'))
  return objToFen(Object.fromEntries(obj))
}

export class Game {
  #chess;
  #history;
  #moves;
  #moveIndex;
  #startFen;
  #orientation;

  constructor(fen) {
    this.#chess = new Chess(fen);
    this.#history = [{ i: '_', f: this.#chess.fen() }];
    this.#moves = [{ i: '_', f: this.#chess.fen() }];
    this.#moveIndex = '_';
    this.#startFen = this.#chess.fen();
    this.#orientation = this.#chess.turn();
  };

  #getMoveNumber = (fen) => {
    const fenArr = fen?.split(' ');
    if (fenArr && fenArr.length === 6) {
      return +fenArr.at(5);
    }
    return 1;
  };

  #getNextMoveIndex = (index) => {
    if (index === '_') return '0';
    const indArr = index.split('-');
    const count = indArr.pop();
    indArr.push(+count + 1);
    return indArr.join('-');
  };

  #getVarCount = (index) => {
    const indLen = index.split('-').length;
    return this.#history.filter(({ i }) => i.startsWith(index) && i.split('-').length === (indLen + 2)).map(({ i }) => +(i.split('-').at(indLen)) + 1);
  };

  #saveMove = (move) => {
    if (!(move && move.i && move.f && (move.s || move.c))) return;
    const obj = { ...move };
    if (obj.i.includes('-')) {
      const search = obj.i.split('-').reduce((p, c, i, a) => {
        if (i === 0) {
          p.push(c);
        } else if (i % 2 === 0) {
          p.push(`${a.at(i - 1)}-${c}`);
        }
        return p;
      }, []);
      let temp;
      search.forEach((e, i) => {
        if (i === 0) {
          temp = this.#moves.find((a) => a.i === e);
        } else {
          if (temp) {
            if (temp.v && temp.v.length) {
              const ind = e.split('-');
              let temp1 = temp.v.at(ind.at(0));
              if (temp1 && temp1 && temp1.length) {
                let temp2 = temp1.at(ind.at(1));
                if (temp2) {
                  temp = temp2;
                } else {
                  temp1.push(obj);
                }
              } else {
                temp.v.push([obj]);
              }
            } else {
              temp.v = [[obj]];
            }
          }
        }
      });
    } else if (obj.i === '_') {
      this.#moves[0] = obj;
    } else {
      this.#moves.push(obj);
    }
  };

  #makeMove = (move, illegal, readonly) => {
    if (move) {
      let data;
      if (move.from && move.to) {
        if (illegal) {
          this.#chess.put(this.#chess.remove(move.from), move.to);
          const fenArr = this.#chess.fen().split(' ');
          fenArr[1] = fenArr[1] === 'w' ? 'b' : 'w';
          fenArr[2] = fenArr[2].split('').filter(e => e && fenArr[0].includes(e === 'Q' ? 'K' : (e === 'q' ? 'k' : e))).join('');
          fenArr[1] === 'w' && (fenArr[4] = +fenArr[4] + 1);
          fenArr[1] === 'w' && (fenArr[5] = +fenArr[5] + 1);
          data = { san: `${move.from}-${move.to}`, from: move.from, to: move.to, color: fenArr[1] === 'w' ? 'b' : 'w', illegal: true };
          this.#chess.load(fenArr.join(' '));
        } else {
          data = this.#chess.move(move, { sloppy: true });
        }
      } else if (move.s) {
        if (move.illegal && move.f) {
          const [from, to] = move.s.split('-');
          data = { san: move.s, from, to, color: move.f.split(' ')[1] === 'w' ? 'b' : 'w', illegal: true };
          this.#chess.load(move.f);
        } else {
          data = this.#chess.move(move.s, { sloppy: true });
        }
      }

      if (data) {
        const fen = this.#chess.fen();
        const obj = { i: this.#getNextMoveIndex(this.#moveIndex), s: data.san, f: fen, from: data.from, to: data.to };
        if (move.c) obj.c = move.c;
        if (move.a && move.a.length) obj.a = move.a;
        if (data.color === 'w') obj.n = `${this.#getMoveNumber(fen)}.`;
        if (this.#moveIndex === '_' && data.color === 'b' && !obj.n) obj.n = `${this.#getMoveNumber(fen) - 1}...`;
        const nextMov = this.#history.find(({ i }) => i === obj.i);
        if (nextMov) {
          if (nextMov.s === data.san) {
            this.#moveIndex = nextMov.i;
            return this.#moveIndex;
          } else {
            const varCountArr = this.#getVarCount(obj.i);
            if (varCountArr.length) {
              const varCount = Math.max(...varCountArr);
              const nextVarInd = Array(varCount).fill().map((_, i) => `${obj.i}-${i}-0`);
              const match = this.#history.find(({ i, s }) => nextVarInd.includes(i) && s === data.san);
              if (match) {
                this.#moveIndex = match.i;
                return this.#moveIndex;
              } else {
                if (data.color === 'b' && !obj.n) obj.n = `${this.#getMoveNumber(fen) - 1}...`;
                obj.i = `${obj.i}-${varCount}-0`;
              }
            } else {
              if (data.color === 'b' && !obj.n) obj.n = `${this.#getMoveNumber(fen) - 1}...`;
              obj.i = `${obj.i}-0-0`;
            }
          }
        }
        if (data.illegal) obj.illegal = true;
        if (readonly) {
          obj.p = this.pgn();
          this.#chess.undo();
        } else {
          this.#moveIndex = obj.i;
          this.#history.push(obj);
          this.#saveMove(obj);
        } return obj;
      } return null;
    } return null;
  };

  #setArrow = (data) => {
    const move = this.#history.find(({ i }) => i === this.#moveIndex);
    if (move) {
      if (data && data.f && data.t && data.c) {
        const arrows = move.a || [];
        if (arrows.find(({ f, t, c }) => f === data.f && t === data.t && c === data.c)) {
          move.a = arrows.filter(({ f, t, c }) => !(f === data.f && t === data.t && c === data.c));
          if (!move.a.length) delete move['a'];
        } else {
          move.a = arrows.filter(({ f, t }) => !(f === data.f && t === data.t));
          move.a.push(data);
        }
      } else {
        delete move['a'];
      }
    } return this.#history;
  };

  #setComment = ({ index, comment }) => {
    const move = this.#history.find(({ i }) => i === index);
    if (move) {
      if (comment) {
        move.c = comment;
      } else {
        delete move['c'];
      }
    } this.setMoves(this.#history);
    return this.#history;
  };

  #getArrows = () => {
    const move = this.#history.find(({ i }) => i === this.#moveIndex);
    if (move) {
      return move.a || [];
    }
    return [];
  };

  #getPgn = (data) => data.filter(m => m && m.s && m.i).map(m => m.n ? `${m.n} ${m.s}` : m.s).join(' ');

  moveIndex = () => this.#moveIndex;
  startFen = () => this.#startFen;
  orientation = () => this.#orientation;
  fen = () => this.#chess.fen();
  pgn = () => this.#chess.pgn({ newline_char: '|' }).split('|').at(-1);
  turn = () => this.#chess.turn();
  possibleMoves = () => this.#chess.moves();
  isGameOver = () => this.#chess.game_over();
  isCheck = () => this.#chess.in_check();
  isCheckMate = () => this.#chess.in_checkmate();
  isDraw = () => this.#chess.in_draw();
  isStaleMate = () => this.#chess.in_stalemate();
  isThreeFoldRepetition = () => this.#chess.in_threefold_repetition();
  isInsufficientMaterial = () => this.#chess.insufficient_material();
  moves = () => JSON.parse(JSON.stringify(this.#moves));
  history = () => JSON.parse(JSON.stringify(this.#history));
  arrows = () => [...this.#getArrows()];
  arrow = (data) => this.#setArrow(data);
  comment = (data) => this.#setComment(data);

  move = (move, illegal) => {
    const data = this.#makeMove({ ...move }, illegal, false);
    if (data) {
      if (typeof data === 'string') {
        return data;
      } else {
        return { ...data };
      }
    } return null;
  };

  setMoves = (data) => {
    if (data && data.length) {
      this.#moves = [{ i: '_', f: this.#startFen }];
      this.#history = data;
      this.#history.forEach(this.#saveMove);
    } return this.moves();
  };

  setHistory = (data) => {
    if (data && data.length) {
      this.#history = data;
    } return true;
  };

  getMove = (index) => {
    const move = this.#history.find(({ i }) => i === index);
    if (move) return { ...move };
    return null;
  };

  selectMove = (index) => {
    if (!index) return null;
    const move = this.#history.find(({ i }) => i === index);
    if (move && move.f && this.#chess.load(move.f)) {
      this.#moveIndex = move.i;
      return { ...move };
    } else {
      return null;
    }
  };

  solve = (data) => {
    const move = this.#makeMove({ ...data }, false, true);
    if (move) {
      if (typeof move === 'string') {
        return { status: 1, move: this.getMove(move), next: this.getMove(this.next()) };
      } else {
        return { status: 0, move: { ...move }, next: null };
      }
    } return null;
  };

  possibleMoves = (square) => {
    const moves = square ? (this.#chess.moves({ square, verbose: true }).map((e) => e.to) || []) : [];
    return [...moves];
  };

  first = () => {
    if (this.#moveIndex === '0' || this.#moveIndex === '_') return null;
    if (this.#moveIndex.includes('-')) {
      const indArr = this.#moveIndex.split('-');
      const neIndArr = indArr.at(-1) === '0' ? indArr.slice(0, -2) : indArr;
      neIndArr.pop();
      neIndArr.push('0');
      const index = neIndArr.join('-');
      if (this.#history.find(({ i }) => i === index)) return index;
      return null;
    } return '0';
  };

  last = () => {
    const { i } = this.#moves.at(-1);
    if (i === this.#moveIndex) return null;
    return i;
  };

  prev = () => {
    if (this.#moveIndex === '0') {
      return '_';
    } else if (this.#moveIndex === '_') {
      return null;
    } else {
      const indArr = this.#moveIndex.split('-');
      const neIndArr = indArr.at(-1) === '0' ? indArr.slice(0, -2) : indArr;
      const count = neIndArr.pop();
      neIndArr.push(+count - 1);
      const index = neIndArr.join('-');
      if (index === '-1') return '_';
      if (this.#history.find(({ i }) => i === index)) return index;
      return null;
    }
  };

  next = () => {
    const nextInd = this.#getNextMoveIndex(this.#moveIndex);
    if (this.#history.find(({ i }) => i === nextInd)) {
      return nextInd;
    } else if (this.#moves.at(-1).i === this.#moveIndex) {
      return null;
    } else if (this.#moveIndex.includes('-')) {
      const indArr = this.#moveIndex.split('-').slice(0, -2);
      const count = indArr.pop();
      indArr.push(+count + 1);
      const index = indArr.join('-');
      if (this.#history.find(({ i }) => i === index)) return index;
      return null;
    } return null;
  };

  newNext = () => {
    const next = this.next();
    if (next) {
      let moves = this.moves(); let move = null; let index = null;
      const indArr = next.split('-');
      indArr.forEach((e, i) => {
        index = i === 0 ? +e + 1 : +e;
        move = moves.at(index);
        if (move) {
          if (Array.isArray(move)) {
            moves = move;
          } else if (move && move.v && move.v.length && i !== indArr.length - 1) {
            moves = move.v;
          }
        }
      });
      if (move && move.i && moves && moves.length) {
        if (move.v && move.v.length) {
          if (!move.n) move.n = move.v.at(0)?.at(0)?.n;
          return [{ index: move.i, pgn: this.#getPgn(moves.slice(index)), id: null }, ...move.v.map((v, i) => ({ index: v.at(0).i, pgn: this.#getPgn(v), id: `${move.i}-${i}` }))];
        } return move.i;
      }
    } return null;
  };

  content = () => {
    const moves = [];
    this.#history.filter(e => e && e.i).forEach(move => {
      const obj = { ...move };
      if (obj.i.includes('-')) {
        const search = obj.i.split('-').reduce((p, c, i, a) => {
          if (i === 0) {
            p.push(c);
          } else if (i % 2 === 0) {
            p.push(`${a.at(i - 1)}-${c}`);
          }
          return p;
        }, []);
        let temp;
        search.forEach((e, i) => {
          if (i === 0) {
            temp = moves.find((a) => a.i === e);
          } else {
            if (temp) {
              if (temp.v && temp.v.length) {
                const ind = e.split('-');
                let temp1 = temp.v.at(ind.at(0));
                if (temp1 && temp1 && temp1.length) {
                  let temp2 = temp1.at(ind.at(1));
                  if (temp2) {
                    temp = temp2;
                  } else {
                    temp1.push(obj);
                  }
                } else {
                  temp.v.push([obj]);
                }
              } else {
                temp.v = [[obj]];
              }
            }
          }
        });
      } else {
        moves.push(obj);
      }
    });
    const getNotations = (moves) => {
      return moves.map(({ i, f, s, c, a, v, illegal }) => {
        const obj = i === '_' ? { f } : { s };
        if (illegal) obj.f = f;
        if (c && c.length) obj.c = c;
        if (a && a.length) obj.a = a;
        if (v && v.length) obj.v = v.map(getNotations);
        return obj;
      })
    };
    return JSON.stringify(getNotations(moves));
  };

  load = (data) => {
    if (data && data.fen && data.moves) {
      const res = this.#chess.load(data.fen);
      if (res) {
        this.#chess = new Chess(data.fen);
        this.#history = [{ i: '_', f: this.#chess.fen() }];
        this.#moves = [{ i: '_', f: this.#chess.fen() }];
        this.#moveIndex = '_';
        this.#startFen = this.#chess.fen();
        this.#orientation = this.#chess.turn();
        const parseMoves = (moves) => {
          moves.forEach(e => {
            if (e && (e.s || e.f)) {
              if (e.s) {
                if (e.f) e.illegal = true;
                e.i = this.move(e)?.i;
              } else {
                this.#moves[0] = { i: '_', ...e };
                this.#history[0] = { i: '_', ...e };
              }
            }
          });
          moves.forEach(e => {
            if (e && e.i && e.v && e.v.length) {
              e.v.forEach((v) => {
                this.#moveIndex = e.i;
                if (this.selectMove(this.prev())) parseMoves(v);
              });
            }
          });
        };
        parseMoves(data.moves);
      }
      this.selectMove('_');
      return {
        fen: this.#startFen,
        history: [...this.#history],
        moveIndex: this.#moveIndex
      };
    } return null;
  };

  loadFen = (fen) => {
    const res = this.#chess.load(fen);
    if (res) {
      this.#chess = new Chess(fen);
      this.#history = [{ i: '_', f: this.#chess.fen() }];
      this.#moves = [{ i: '_', f: this.#chess.fen() }];
      this.#moveIndex = '_';
      this.#startFen = this.#chess.fen();
      this.#orientation = this.#chess.turn();
      return {
        fen: this.#startFen,
        history: [...this.#history],
        moveIndex: this.#moveIndex
      };
    } return null;
  };

  loadHistory = (data) => {
    if (data.fen && data.moveIndex && data.history && data.history.length && this.loadFen(data.fen)) {
      this.#history = JSON.parse(JSON.stringify(data.history.filter(e => e && e.i)));
      this.#history.forEach(this.#saveMove);
      return this.selectMove(data.moveIndex);
    } return null;
  };

};
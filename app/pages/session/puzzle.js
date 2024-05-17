import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { Text, TouchableOpacity, View, ScrollView, TextInput, FlatList, Pressable, BackHandler } from 'react-native';
import { DataTable } from 'react-native-paper';
import { AntDesign, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Game } from '../../chess';
import { Empty, Header, Level, Progress } from '../../factory';
import { getData, getDocsByField } from '../../service';
import { startFen, pageSize } from '../../constant';
import { UserState } from '../../state';
import Fen from '../../fen';
import s from '../../style';
import Move from '../../move';

const game = new Game()

const waitFor = (ms) => new Promise(r => setTimeout(r, ms));

const asyncForEach = async(array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const getQuery = (user = null) => ['puzzles', [user ? ['createdBy', '==', user] : ['public', '==', true], ['status', '==', 1]], [['week', 'asc'], ['topic', 'asc']]];

const FenView = memo(({name, fen = startFen, moves = []}) => {
  const [game] = useState(new Game());
  const [move, setMove] = useState({f: fen, i: '_'});
  const [his, setMoves] = useState([]);

  useEffect(() => {
    const result = game.load({fen, moves});
    setMoves(result ? game.moves() : []);
  }, []);

  return (
    <View>
      <Text style={{...s.cfff, ...s.fs18, alignSelf: 'center', marginTop: 8}}>{name}</Text>
      <Fen fen={move.f} orientation={fen.split(' ')[1]} />
      <Move moves={his} index={move.i} onMove={(ind) => setMove(game.selectMove(ind))} />
    </View>
  );
});

const Puzzle = ({open, index, onBack, onChange}) => {
  const user = useRecoilValue(UserState);
  const scrollRef = useRef(null)
  const layoutRef = useRef([])
  const dbRef = useRef(null);
  const lastDoc = useRef(null);
  const hasMore = useRef(false);
  const gamesRef = useRef([]);
  const [type, setType] = useState(1);
  const [select, setSelect] = useState(false);
  const [search, setSearch] = useState('');
  const [progress, setProgress] = useState(true);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [db, setDb] = useState(null);
  const [page, setPage] = useState(-1);
  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);

  const getGames = (page) => gamesRef.current.slice(((page || 1) - 1) * 10, (page || 1) * 10);
  
  useEffect(() => {
    layoutRef.current = []
    setGames([]);
    if (page >= 0) {
      asyncForEach(getGames(page + 1), async(e) => {
        await waitFor(0);
        setGames(data => [...data, e]);
      });
    }
  }, [page]);

  const onPageChange = (page) => {
    setPage(page);
  };

  const onDbClick = useCallback(async(db) => {
    if (db.id) {
      dbRef.current = db.id;
      setDb({...db});
      if (!db.gamesLoaded) {
        db.games = await getDocsByField('games', [['database', '==', db.id]]);
        db.games.forEach(e => {
          const result = game.load({fen: e.fen, moves: JSON.parse(e.moves)});
          e.moves = result ? game.moves() : [];
          e.moveIndex = result?.moveIndex || '_';
          e.history = result?.history || [];
        })
        db.games.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        db.gamesLoaded = true;
        setDb({...db});
      }
      gamesRef.current = db.games || [];
      setTotal(gamesRef.current.length);
      onPageChange(0);
    }
  }, []);

  const loadMore = useCallback(async() => {
    if (!lastDoc.current) return;
    setLoading(true);
    const data = await getData(...getQuery(user.id), [lastDoc.current.week], search);
    data.forEach(e => e.id = e.puzzle || e.id);
    lastDoc.current = data.at(-1);
    hasMore.current = data.length === pageSize;
    setDocs(d => [...d, ...data]);
    setLoading(false);
  }, [search]);

  const loadData = useCallback(async() => {
    setProgress(true);
    const data = await getData(...getQuery(user.id), null, search);
    data.forEach(e => e.id = e.puzzle || e.id);
    lastDoc.current = docs.at(-1);
    hasMore.current = docs.length === pageSize;
    setDocs([...data]);
    setProgress(false);
  }, [search]);

  useEffect(() => {
    loadData();
  }, []);

  const onBackClick = () => {
    gamesRef.current = [];
    setPage(-1);
    setSelected(null);
    setDb(null);
    onBack();
  };

  const onLayout = useCallback((e) => {
    const y = e?.nativeEvent?.layout?.y;
    if (y) scrollRef.current?.scrollTo({ x: 0, y, animated: true });
  }, [index])

  useEffect(() => {
    if (index !== null) {
      onPageChange(Math.floor(index / 10))
      setSelected(gamesRef.current[index]?.id)
    }
  }, [index])

  return (
    <View style={{...s.modal, ...s.bc2, opacity: open ? 1 : 0, zIndex: 100 * (open ? 1 : -1)}}>
      <Header filter={false} title='Load Game' icon={<MaterialCommunityIcons name='puzzle-outline' color='#87CEFA' size={30} />}>
        {!db && <View style={{...s.mla, position: 'relative'}}>
          <TouchableOpacity onPress={() => setSelect(true)}>
            <TextInput
              editable={false}
              numberOfLines={1}
              value={type === 1 ? 'Puzzles' : 'Games'}
              style={{
                ...s.p4,
                ...s.px8,
                ...s.br5,
                ...s.fs16,
                paddingRight: 26,
                borderWidth: 1,
                color: '#FFF',
                borderColor: '#CCC'
              }}
            />
            <AntDesign name='caretdown' color='#FFF' size={12} style={{position: 'absolute', top: 12, right: 8}} />
          </TouchableOpacity>
          {select && <View style={{position: 'absolute', left: 0, right: 0, top: 40, zIndex: 1000, borderColor: '#FFF', borderWidth: 1, borderRadius: 4, ...s.bc2}}>
            <TouchableOpacity onPress={() => { setType(1); setSelect(false); }}>
              <Text style={{...s.cbbb, ...s.fs16, ...s.p4}}>Puzzles</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setType(2); setSelect(false); }}>
              <Text style={{...s.cbbb, ...s.fs16, ...s.p4}}>Games</Text>
            </TouchableOpacity>
          </View>}
        </View>}
        {db && <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.mla, paddingRight: 8, ...s.br20, backgroundColor: '#87CEFA'}} onPress={onBackClick}>
          <MaterialIcons name='chevron-left' size={30} />
          <Text>Back</Text>
        </TouchableOpacity>}
      </Header>
      {db ? !db.gamesLoaded ? <Progress /> : <>
        <DataTable.Pagination
          page={page}
          numberOfPages={Math.ceil(total / 10)}
          onPageChange={onPageChange}
          label={`${page * 10 + 1}-${Math.min((page + 1) * 10, total)} of ${total}`}
          showFastPaginationControls
          numberOfItemsPerPage={10}
        />
        <ScrollView overScrollMode='never' contentContainerStyle={{gap: 8}} ref={scrollRef}>
          {games.map((e, i) => <View onLayout={(e) => Math.floor(index % 10) === i ? onLayout(e) : undefined} key={i} style={{backgroundColor: '#333', borderColor: '#87CEFA', borderRadius: 12, borderWidth: selected === e.id ? 2 : 0}}>
            <FenView {...e} />
            <View style={{...s.fdr, ...s.aic, ...s.jcc, ...s.g8, marginBottom: 12}}>
              <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.g4, ...s.p5, ...s.px8, ...s.br20, backgroundColor: '#87CEFA'}} onPress={() => {setSelected(e.id), onChange(1, e, {games: gamesRef.current, page, index: i})}}>
                <Text>Load Game</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.g4, ...s.p5, ...s.px8, ...s.br20, backgroundColor: '#87CEFA'}} onPress={() => {setSelected(e.id), onChange(2, e, {games: gamesRef.current, page, index: i})}}>
                <Text>Load FEN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.g4, ...s.p5, ...s.px8, ...s.br20, backgroundColor: '#87CEFA'}} onPress={() => {setSelected(e.id), onChange(3, e, {games: gamesRef.current, page, index: i})}}>
                <Text>Ask Question</Text>
              </TouchableOpacity>
            </View>
          </View>)}
        </ScrollView>
      </> : progress ? <View style={{...s.f1}}><Progress /></View> : docs.length ? <FlatList
        data={docs}
        keyExtractor={item => item.id}
        onEndReached={!loading && loadMore}
        onEndReachedThreshold={0.01}
        ListFooterComponent={loading && <Progress />}
        style={s.p8}
        refreshing={false}
        onRefresh={loadData}
        ItemSeparatorComponent={() => <View style={{height: 8}} />}
        renderItem={({item, index}) => <Pressable style={{...s.fdr, ...s.bc3, ...s.br8, ...s.p8, ...s.g8}} onPress={() => onDbClick(item)}>
          <Text numberOfLines={1} style={{...s.f1, ...s.cfff, ...s.fs17}}>{++index}. {item.topic} ({item.count})</Text>
          <Level value={+item.level} />
        </Pressable>}
      /> : <Empty />}
    </View>
  );
};

const Root = ({onChange = () => {}}) => {
  const db = useRef([])
  const type = useRef()
  const [index, setIndex] = useState(null)
  const [open, setOpen] = useState(false)

  const onSelect = (ind) => {
    if (ind >= 0 && ind < db.current.length) {
      setIndex(ind)
      onChange(type.current, db.current[ind])
    }
  }

  const onBack = () => {
    db.current = []
    setIndex(null)
  }

  const onDataChange = (mode, data, store) => {
    db.current = store.games
    type.current = mode
    setIndex(((store.page) * 10) + store.index)
    setOpen(false)
    onChange(type.current, data)
  }

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      open ? setOpen(false) : onChange()
      return true
    })
    return () => backHandler.remove()
  }, [open])

  return <>
    <Puzzle open={open} index={index} onBack={onBack} onChange={onDataChange} />
    <View style={{...s.fdr, ...s.aic, ...s.jcc, ...s.g2, ...s.p4}}>
      <TouchableOpacity disabled={index === 0} onPress={() => onSelect(index - 1)} style={{...s.aic, ...s.jcc, ...s.br5, ...s.bc3, height: 30, width: 30}}>
        <MaterialIcons name='chevron-left' color='#87CEFA' size={30} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setOpen(true)} style={{...s.aic, ...s.jcc, ...s.br5, ...s.bc3, height: 30, width: 100}}>
        <Text style={{color: '#87CEFA'}}>Load Game {index !== null && `(${index + 1})`}</Text>
      </TouchableOpacity>
      <TouchableOpacity disabled={index === db.current.length - 1} onPress={() => onSelect(index + 1)} style={{...s.aic, ...s.jcc, ...s.br5, ...s.bc3, height: 30, width: 30}}>
        <MaterialIcons name='chevron-right' color='#87CEFA' size={30} />
      </TouchableOpacity>
    </View>
  </>
}

export default memo(Root);

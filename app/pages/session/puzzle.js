import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { Dimensions, Text, TouchableOpacity, View, ScrollView, TextInput, FlatList, Pressable } from 'react-native';
import { DataTable } from 'react-native-paper';
import { AntDesign } from '@expo/vector-icons';
import { Game } from '../../chess';
import { Empty, Header, Level, Progress } from '../../factory';
import { getData, getDocsByField } from '../../service';
import { startFen, pageSize } from '../../constant';
import { UserState } from '../../state';
import Fen from '../../fen';
import s from '../../style';
import Move from '../../move';

const waitFor = (ms) => new Promise(r => setTimeout(r, ms));

const asyncForEach = async(array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const getQuery = (user = null) => ['puzzles', [user ? ['createdBy', '==', user] : ['public', '==', true], ['status', '==', 1]], [['week', 'asc'], ['topic', 'asc']]];

const FenView = memo(({fen = startFen, moves = '' }) => {
  const [game] = useState(new Game());
  const [move, setMove] = useState({f: fen, i: '_'});
  const [his, setMoves] = useState([]);

  useEffect(() => {
    const result = game.load({fen, moves: JSON.parse(moves)});
    setMoves(result ? game.moves() : []);
  }, []);

  return (
    <View>
      <View style={{ height: Math.min(Dimensions.get('window').width, Dimensions.get('window').height), padding: 8 }}>
        <Fen fen={move.f} orientation={fen.split(' ')[1]} />
      </View>
      <Move moves={his} index={move.i} onMove={(ind) => setMove(game.selectMove(ind))} />
    </View>
  );
});

const Puzzle = ({open=false, onClose=()=>{}}) => {
  const user = useRecoilValue(UserState);
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
  const [page, setPage] = useState(0);
  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);

  const getGames = (page) => gamesRef.current.slice(((page || 1) - 1) * 10, (page || 1) * 10);

  const onPageChange = (page) => {
    setGames([]);
    setPage(page);
    asyncForEach(getGames(page + 1), async(game) => {
      await waitFor(0);
      setGames(games => [...games, game]);
    });
  };

  const onDbClick = useCallback(async(db) => {
    if (db.id) {
      dbRef.current = db.id;
      setDb({...db});
      if (!db.gamesLoaded) {
        db.games = await getDocsByField('games', [['database', '==', db.id]]);
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

  return (
    <View style={{...s.modal, ...s.bc2, opacity: open ? 1 : 0, zIndex: 1000 * open ? 1 : -1}}>
      <Header filter={false} title='Load Game' onBack={() => db ? setDb(null) : onClose()}>
        {!db && <View style={s.mla}>
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
          {select && <View style={{position: 'absolute', left: 0, right: 0, top: 40, zIndex: 100, borderColor: '#FFF', borderWidth: 1, borderRadius: 4}}>
            <TouchableOpacity onPress={() => { setType(1); setSelect(false); }}>
              <Text style={{...s.cbbb, ...s.fs16, ...s.p4}}>Puzzles</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setType(2); setSelect(false); }}>
              <Text style={{...s.cbbb, ...s.fs16, ...s.p4}}>Games</Text>
            </TouchableOpacity>
          </View>}
        </View>}
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
        <ScrollView>
          {games.map((e, i) => <View key={i}>
            <FenView {...e} />
            <View style={{...s.fdr, ...s.aic, ...s.jcc, ...s.g8}}>
              <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.g4, ...s.p5, ...s.px8, ...s.br20, backgroundColor: '#87CEFA'}} onPress={() => onClose(e)}>
                <Text>Load Game</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{...s.fdr, ...s.aic, ...s.g4, ...s.p5, ...s.px8, ...s.br20, backgroundColor: '#87CEFA'}} onPress={() => onClose(e.fen)}>
                <Text>Load Fen</Text>
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

export default Puzzle;

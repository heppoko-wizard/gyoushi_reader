import path from 'path-browserify';

const baseUrl = '/gyoushi_reader/dict/';
const filename = 'base.dat.gz';
const joined = path.join(baseUrl, filename);

console.log('Base URL:', baseUrl);
console.log('Filename:', filename);
console.log('Joined Path:', joined);

const baseUrlHttp = 'http://localhost:5174/gyoushi_reader/dict/';
const joinedHttp = path.join(baseUrlHttp, filename);
console.log('Joined HTTP Path:', joinedHttp);

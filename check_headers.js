import http from 'http';

const options = {
    hostname: 'localhost',
    port: 5174,
    path: '/gyoushi_reader/dict/base.dat.gz',
    method: 'HEAD'
};

const req = http.request(options, (res) => {
    console.log('STATUS:', res.statusCode);
    Object.keys(res.headers).forEach(key => {
        console.log(key + ': ' + res.headers[key]);
    });
});

req.on('error', (e) => {
    console.error('problem with request:', e.message);
});

req.end();

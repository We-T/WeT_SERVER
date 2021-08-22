const mysql         = require('mysql'),
      express       = require('express'),
      http          = require('http'),
      path          = require('path'),
      bodyParser    = require('body-parser'),
      fs            = require('fs'),
      dbconfig      = require('./config/database.js'),
      connection    = mysql.createConnection(dbconfig),
      request       = require('request'),
      cheerio       = require('cheerio'),
      session       = require('express-session'),
      mysql_store   = require('express-mysql-session')(session),
      router        = express.Router();

const app = express();

//세션 미들웨어
var session_store = new mysql_store(dbconfig);
app.use(session({
    secret:"yj305",
    resave:false,
    saveUninitialized:true,
    store: session_store
}));

app.use(bodyParser.urlencoded({extended: true}));

// API
var url = 'http://api.visitkorea.or.kr/openapi/service/rest/KorService/'; //api 호출 기본 url
var serviceKey = 'p%2BX7gaUwAL7ZCk9tuQCKBphxgCJ4d7moeBFk1StHrffygC7NeEuW68ZuJe6Ph%2F5RBAqgcHxZ3pn%2F5PqoXJn9UA%3D%3D';
var inquiry = '';
queryParams = '?' + encodeURIComponent('ServiceKey') + '=' + serviceKey; // 이후에 += 로 계속 파라미터추가하기

app.post('/join', function (req, res) {
    // join, family에 새 튜플 추가
    var type = req.body.type;
    var email = req.body.email;
    var pwd = req.body.pwd;
    var phone = req.body.phone;
    var name = req.body.name;
    

    // 삽입을 수행하는 sql문.
    var sql = 'insert into users (email, pwd, phone, name, type) VALUES (?, ?, ?, ?, ?)';
    var params = [email, pwd, phone, name, type];
    
    // sql 문의 ?는 두번째 매개변수로 넘겨진 params의 값으로 치환된다.
    connection.query(sql, params, function (err, result) {
        var resultCode = 404;
        var message = '에러가 발생했습니다';

        if (err) {
            console.log(err);
        } else {
            if(type == 1) {
                var sql2 = 'insert into family (email, inherence_number, type) VALUES (?, ?, ?)';
                var inherence_number = phone.substr(3,8); //번호 8자리
                var params2 = [email, inherence_number, type];
                connection.query(sql2, params2, function(err, result) {
                    console.log('자녀회원 family테이블에 입력 완료');
                });
                
            }
            resultCode = 200;
            message = '회원가입에 성공했습니다.';
            
        }

        res.json({
            'code': resultCode,
            'message': message
        });
    });
});

app.post(`/login`, (req, res) => {
    var email = req.body.email;
    var pwd = req.body.pwd;
    
    var sql = 'select * from users where email = ?';
    
    connection.query(sql, email, function(err, result) {
        var resultCode = 404;
        var message = '에러가 발생했습니다';
        
        if (err) {
            console.log(err);
        } else {
            if (result.length == 0) {
                resultCode = 204;
                message = '존재하지 않는 계정입니다!';
            } else if (pwd !== result[0].pwd) {
                resultCode = 204;
                message = '비밀번호가 틀렸습니다!';
            } else {
                //세션
                var sess = req.session;
                sess.email = email;
                sess.logined = true;
                
                resultCode = 200;
                message = '로그인 성공! ' + result[0].name + '님 환영합니다!';
                
                }
            }
        res.json({
            'code': resultCode,
            'message': message
        });
    });
});

app.post(`/mypage`, (req, res) => {
    var email = req.body.email;
    
    var sql = 'select * from family where email = ?';
    
    connection.query(sql, email, function(err, result) {        
        var inherence_number = result[0].inherence_number;
        var sql = 'select * from family where inherence_number = ? and email not in (?)';
        connection.query(sql, [inherence_number, email], function(err, result) {
            if(!err){
                res.json(result); // json처리하나 result자체로 보내나 똑같은 json형식임
            } else{
                console.log('Error while performing Query.', err);
            }
        });
    });
    
});

app.post(`/mypage/add_family`, (req, res) => { //질문1
    
});

app.post(`/mypage/my_good_list`, (req, res) => {
    var email = req.body.email;
    
    var sql = 'select area_code as code, present_day from good_area where email = ? union select tourist_code as code, present_day from good_tourist where email = ?';
    
    connection.query(sql, [email, email], function(err, result) {
        if(!err){
            res.json(result);
        }
    });
});

app.post(`/mypage/parents_good_list`, (req, res) => {//아직안함 가족버전
    var email = req.body.email;
    
    var sql = 'select area_code as code, present_day from good_area where email = ? union select tourist_code as code, present_day from good_tourist where email = ?';
    
    connection.query(sql, [email, email], function(err, result) {
        res.json(result);
    });
});

app.post(`/mypage/trip_record`, (req, res) => {
    var email = req.body.email;
    
    var sql = 'select * from trip_plan where email = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            res.json(result);
        }
    });
});


app.post('main', (req, res) => {
    var email = req.body.email;
});

app.listen(3000, '192.168.123.7', function () {
    console.log('서버 실행 중...');
});



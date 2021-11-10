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
      router        = express.Router(),
      urlencode     = require('urlencode'),
      moment        = require('moment');
const key = require('./keys/key');
const serviceKey = key.publicKey;
const searchKeyword = require('./utils/searchKeyword');
const detailCommon = require('./utils/detailCommon');
const searchFestival = require('./utils/searchFestival');
const defaultRequest = require('./utils/defaultRequest');
const areaBasedList = require('./utils/areaBasedList');
const sql_param_query = require('./utils/sql_param_query');
const sql_query = require('./utils/sql_query');

const app = express();
let today = new Date(); 
var year = today.getFullYear(); // 년도
var month = ('0' + (today.getMonth() + 1)).slice(-2);  // 월
var date = ('0' + today.getDate()).slice(-2);  // 날짜

//세션 미들웨어
var session_store = new mysql_store(dbconfig);
app.use(session({
    secret:"yj305",
    resave:false,
    saveUninitialized:true,
    store: session_store
}));
app.use(express.json());
app.use(bodyParser.urlencoded({extended: true}));

// API
var kor_url = 'http://api.visitkorea.or.kr/openapi/service/rest/KorService/'; //api 호출 기본 url
var inquiry = '';
queryParams = '?' + encodeURIComponent('ServiceKey') + '=' + serviceKey; // 이후에 += 로 계속 파라미터추가하기

// 모든 코드에 대해 결과값이 0일 경우 예외처리 해주기 -> 아직 안함


app.post('/join', (req, res) => {
    console.log("회원가입");
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
                
            } else if (type == 2) {
                var sql2 = 'insert into family (email, inherence_number, type) VALUES (?, ?, ?)';
                var inherence_number = req.body.inherence_number; //번호 8자리 -> 부모면 입력값 받도록
                var params2 = [email, inherence_number, type];
                connection.query(sql2, params2, function(err, result) {
                    console.log('부모회원 family테이블에 입력 완료');
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

app.post('/login', (req, res) => {
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

// OK
app.post(`/mypage`, (req, res) => {
    var email = req.body.email;
    var sql = 'select * from users where email = ?';
    
    sql_param_query(sql, email, (result) => {       
        name = result[0].name;
        type = result[0].type;
        profile = result[0].profile;
        res.json({
            name:result[0].name,
            type:result[0].type,
            profile:result[0].profile
        });
    });
    
});

// OK
app.post('/mypage/add_family', (req, res) => {
    var email = req.body.email;
    var family_list = [];
    
    
    var sql = 'select * from family where email = ?';
    sql_param_query(sql, email, (result1) => {
        var sql2 = 'select email from family where inherence_number = ? and not email = ?';
        sql_param_query(sql2, [result1[0].inherence_number, email], (result2) => {
            for (var i =0; i < result2.length; i++) {
                (function(i) {
                    var sql3 =  'select * from users where email = ?';
                    sql_param_query(sql3, result2[i].email, (result3) => {
                        family_list[i] = {name:result3[0].name, 
                                          profile:result3[0].profile};
                        if(family_list.length == result2.length) {
                            res.json({family_list:family_list});
                        }
                    });
                })(i);
            }
        });
    });
});

/*app.post('/mypage/add_family', (req, res) => {
    var email = req.body.email;
    var family_list = [{"name":"변해식", "profile":"https://cdn.pixabay.com/photo/2016/09/01/08/24/smiley-1635449_1280.png"}, {"name":"전순화", "profile":"https://cdn.pixabay.com/photo/2016/09/01/08/24/smiley-1635449_1280.png"}];
    var send_result = {};
    var inherence_number;
    var name;
    
    var sql = 'select * from family where email = ?';
    connection.query(sql, email, function(err, result1) { 
        inherence_number = result1[0].inherence_number;
        var sql2 = 'select email from family where inherence_number = ? and not email = ?';
        connection.query(sql2, [result1[0].inherence_number, email], function(err, result2) {
            if(!err){
                for (var i =0; i < result2.length; i++) {
                    var sql3 =  'select name from users where email = ?';
                    connection.query(sql3, result2[i].email, function(err, result) {
                        family_list[i] = {"name":result[0].name};
                        console.log(family_list);
                        //send_result.name = result[0].name;
                    });
                }
                send_result.family_list = family_list;
                res.json(send_result); // json처리하나 result자체로 보내나 똑같은 json형식임
            } 
        });
    });
    connection.query(sql, email, function(err, result) {        
        inherence_number = result[0].inherence_number;
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
*/

// OK
app.post('/mypage/add_family_number', (req, res) => { 
    console.log(req.body.email);
    var email = req.body.email;
    var sql = 'select inherence_number from family where email = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            a={"inherence_number":result[0].inherence_number};
            res.json(a);
        }
    });
});

// OK
app.post('/mypage/my_good_list', (req, res) => {
    var email = req.body.email;
    var my_good = [];
    var tag_list = ["자연", "산"];
    var is_good = 1;
    
                    var sql2 = 'select tourist_code from good_tourist where email = ? order by \'index\' desc';
                    sql_param_query(sql2, email, (result2) => { 
                        var cnt = 0;
                        for (var i =0; i < result2.length; i++) {
                            (function(i) {
                                detailCommon(result2[i].tourist_code, (body) => {
                                    cnt++;
                                    my_good[i] = {title:body.item.title, 
                                                  firstimage:body.item.firstimage, 
                                                  addr1:body.item.addr1, 
                                                  tag_list:tag_list, 
                                                  is_good:is_good};
                                    if (cnt == result2.length) {
                                        res.json({
                                            my_good_list:my_good
                                        });
                                    }
                                });
                            })(i);
                        }
                    });
});

// OK
app.post('/mypage/parents_good_list', (req, res) => {//아직안함 가족버전
    var email = req.body.email;
    var inherence_number;
    var p_good_list = [];
    var tag_list = ["자연", "산"];
    var is_good = 1;
    
    var sql = 'select * from family where email = ?';
    sql_param_query(sql, email, (result1) => {
        var sql2 = 'select distinct tourist_code from good_tourist where inherence_number = ? and not email = ? order by \'index\' desc';
        sql_param_query(sql2, [result1[0].inherence_number, email], (result2) => {
            var cnt = 0;
            for (var i =0; i < result2.length; i++) {
                (function(i) {
                    detailCommon(result2[i].tourist_code, (body) => {
                        cnt++;
                        p_good_list[i] = {title:body.item.title, 
                                          firstimage:body.item.firstimage, 
                                          addr1:body.item.addr1, 
                                          tag_list:tag_list, 
                                          is_good:is_good};
                        if (cnt == result2.length) {
                            res.json({
                                p_good_list:p_good_list
                            });
                        }
                    });
                })(i);
            }
        });
    });
});

// OK
app.post('/mypage/trip_record', (req, res) => {
    var email = req.body.email;
    var trip_record_list = [];
    var attend_famliy = [];
    
    var sql1 = 'select * from trip_plan where email = ?'; // emali로 trip_plan에서 여행일정 가져옴
    sql_param_query(sql1, email, (result1) => {
        var tripNum = 0;
        for (var i =0; i < result1.length; i++) {
            (function(i) {
                var sql2 = 'select email from trip_plan where inherence_number = ? and not email = ?';
                //
                sql_param_query(sql2, [inherence_number,email], (result2) => {
                    tripNum++;
                    var famNum = 0;
                    for (var j =0; j < result2.length; j++) {
                        (function(j) {
                            var sql3 = 'select profile from users where email = ?';
                            sql_param_query(sql3, result2[j].email, (result3) => {
                                famNum++;
                                attend_famliy[j] = {profile:result3[0].profile};
                                if (famNum == result2.length) {
                                    var dDay = 'D-';
                                    var day = result1[i].start_day.substr(4,2);
                                    day += '.'+result1[i].start_day.substr(6,2);
                                    day += '~'+result1[i].end_day.substr(4,2)+'.';
                                    day += result1[i].end_day.substr(6,2);
                                    if(result1[i].start_day.substr(4,2) == month) {
                                        cal = result1[i].start_day.substr(6,2) - date;
                                        dDay += cal.toString();
                                        if (cal == 0){
                                            dDay = 'D-Day';
                                        } else if (cal<0) {
                                            cal *= -1;
                                            dDay ='D+'+cal.toString();
                                        }
                                    } else {
                                        var date1 = moment([result1[i].start_day.substr(0,4),result1[i].start_day.substr(4,2), result1[i].start_day.substr(6,2)]);
                                        var date2 = moment([year,month,date]);
                                        //dDay = date1.diff(date2, 'days');
                                        cal = result1[i].start_day.substr(6,2) - date +30;
                                        dDay += cal.toString();
                                        // 일정짜기 날짜에 갖다 씁시다
                                        /*var lastDateOfMonth = ( new Date( result1[i].start_day.substr(0,4), result1[i].start_day.substr(4,2), 0) ).getDate();
                                        cal = result1[i].end_day.substr(6,2) + lastDateOfMonth - result1[i].start_day.substr(6,2);
                                        dDay += cal.toString();*/
                                        
                                    }
                                    trip_record_list[i] = {trip_name:result1[i].trip_name, dDay:dDay, day:day, attend_famliy:attend_famliy};
                                }
                            });
                        })(j);
                    }
                });
            })(i);
        }
    });

    /*var sql1 = 'select * from trip_plan where email = ?';
    sql_param_query(sql1, email, (result1) => {
        var tripNum = 0;
        for (var i =0; i < result1.length; i++) {
            (function(i) {
                var sql2 = 'select email from trip_plan where trip_plan_code = ? and not email = ?';
                sql_param_query(sql2, [result1[i].trip_plan_code,email], (result2) => {
                    tripNum++;
                    var famNum = 0;
                    for (var j =0; j < result2.length; j++) {
                        (function(j) {
                            var sql3 = 'select profile from users where email = ?';
                            sql_param_query(sql3, result2[j].email, (result3) => {
                                famNum++;
                                attend_famliy[j] = {profile:result3[0].profile};
                            });
                            if (famNum == result2.length) {
                                trip_record_list[i] = {trip_name:result1[i].trip_name, start_day:result1[i].start_day, end_day:result1[i].end_day, area_name:result1[i].area_name,attend_famliy:attend_famliy};
                            }
                        })(j);
                    }
                });
                    if (tripNum == result1.length) {
                        res.json({
                            trip_record_list:trip_record_list
                        });
                    }
            })(i);
        }
    });*/
});

// OK
app.post('/main', (req, res) => {
    console.log(req.body);
    const outpuStr = (wait) => {
        setTimeout(() => {
            res.json({wet_good:wet_good, tv_tour:tv_tour, festival:festival, p_good_list:p_good, trip_record_list:trip_record_list, name:name, profile:profile, type:type, num_fam:num_fam});
    
        }, wait);
    };
    var email = req.body.email;
    var name; var profile; var type; var num_fam = 0;
    var inherence_number;
    var tag_list = ["자연", "산"];
    var p_good = []; var trip_record_list = []; var festival = []; var wet_good = []; var tv_tour = [];
    var attend_famliy = [];
    var sql = 'select * from family where email = ?';
    sql_param_query(sql, email, (result5) => {
        inherence_number = result5[0].inherence_number;
        var sql = 'select * from users where email = ?';
        sql_param_query(sql, email, (result6) => {     
            name = result6[0].name;
            type = result6[0].type;
            profile = result6[0].profile;
            
            var sql = 'select * from family where inherence_number = ?';
            sql_param_query(sql, inherence_number, (result7) => {  
                if (result7.length >= 2){
                    num_fam = 1;
                    //부모님이 좋아요한 지역 반환
                    var p_good_sql = 'select distinct tourist_code from good_tourist where inherence_number = ? and not email = ?';
                    sql_param_query(p_good_sql, [inherence_number, email], (result) => { 
                        for (var i =0; i < result.length; i++) {
                            (function(i) {
                                detailCommon(result[i].tourist_code, (body) => {
                                    p_good[i] = {title:body.item.title, 
                                                 firstimage:body.item.firstimage};
                                });
                            })(i);
                        }
                    });
                }
                //위트가 추천하는 관광지 반환
                var wet_good_sql = 'select tourist_code from good_tourist group by tourist_code order by \'tourist_code\' limit 10';
                sql_query(wet_good_sql, (result) => {
                    for(var i = 0; i < result.length; i++) {
                        (function(i) {
                            detailCommon(result[i].tourist_code, (body) => {
                                wet_good[i] = {title:body.item.title, 
                                               firstimage:body.item.firstimage,
                                               tag_list:tag_list};
                            });
                        })(i);
                    }
                });

                //tv속 여행지 -> 공통정보에서 랜덤 5개
                var keyword = urlencode.encode("담양", "UTF-8");
                var totalCount; var pageNo; var result_search_keyword = [];

                searchKeyword(keyword, (body) => {
                    totalCount = body.totalCount; pageNo = body.pageNo;
                    for (var i=0; i < body.item.length; i++) {
                        tv_tour[i] = {addr1:body.item[i].addr1, firstimage:body.item[i].firstimage, tag_list:tag_list};
                    }
                });

                //행사정보
                var startD = year.toString()+month.toString()+date.toString(); 
                var endD = year.toString()+month.toString()+'31';
                    //만약 오류나면 월에 상관없이 day가 31이라서 그런거임
                searchFestival(startD, endD, (body) => {
                    for (var i=0; i <body.item.length; i++) {
                        (function(i) {
                            festival[i] = {title:body.item[i].title, firstimage:body.item[i].firstimage, addr1:body.item[i].addr1};
                        })(i);
                    }
                });

                var sql1 = 'select * from trip_plan where email = ?'; // emali로 trip_plan에서 여행일정 가져옴
                sql_param_query(sql1, email, (result1) => {
                    var tripNum = 0;
                    for (var i =0; i < result1.length; i++) {
                        (function(i) {
                            var sql2 = 'select email from trip_plan where inherence_number = ? and not email = ?';
                            //
                            sql_param_query(sql2, [inherence_number,email], (result2) => {
                                tripNum++;
                                var famNum = 0;
                                for (var j =0; j < result2.length; j++) {
                                    (function(j) {
                                        var sql3 = 'select profile from users where email = ?';
                                        sql_param_query(sql3, result2[j].email, (result3) => {
                                            famNum++;
                                            attend_famliy[j] = {profile:result3[0].profile};
                                            if (famNum == result2.length) {
                                                var dDay = 'D-';
                                                var day = result1[i].start_day.substr(4,2);
                                                day += '.'+result1[i].start_day.substr(6,2);
                                                day += '~'+result1[i].end_day.substr(4,2)+'.';
                                                day += result1[i].end_day.substr(6,2);
                                                if(result1[i].start_day.substr(4,2) == month) {
                                                    cal = result1[i].start_day.substr(6,2) - date;
                                                    dDay += cal.toString();
                                                    if (cal == 0){
                                                        dDay = 'D-Day';
                                                    } else if (cal<0) {
                                                        cal *= -1;
                                                        dDay ='D+'+cal.toString();
                                                    }
                                                } else {
                                                    var date1 = moment([result1[i].start_day.substr(0,4),result1[i].start_day.substr(4,2), result1[i].start_day.substr(6,2)]);
                                                    var date2 = moment([year,month,date]);
                                                    //dDay = date1.diff(date2, 'days');
                                                    cal = result1[i].start_day.substr(6,2) - date +30;
                                                    dDay += cal.toString();
                                                    // 일정짜기 날짜에 갖다 씁시다
                                                    /*var lastDateOfMonth = ( new Date( result1[i].start_day.substr(0,4), result1[i].start_day.substr(4,2), 0) ).getDate();
                                                    cal = result1[i].end_day.substr(6,2) + lastDateOfMonth - result1[i].start_day.substr(6,2);
                                                    dDay += cal.toString();*/
                                                    
                                                }
                                                trip_record_list[i] = {trip_name:result1[i].trip_name, dDay:dDay, day:day, attend_famliy:attend_famliy};
                                            }
                                        });
                                    })(j);
                                }
                            });
                        })(i);
                    }
                });
            });
        });
    });
    outpuStr(2000);
});

// OK
app.post('/search/keyword', (req, res) => {
    var keyword = urlencode.encode(req.body.keyword, "UTF-8");
    var totalCount; var pageNo; var result_search_keyword = [];
    
    searchKeyword(keyword, (body) => {
        totalCount = body.totalCount; pageNo = body.pageNo;
        for (var i=0; i < body.item.length; i++) {
            (function(i) {
                var sql = 'select * from tag_list where contentTypeId = ?'
                sql_param_query(sql, body.item[i].contenttypeid, (result) => {
                    result_search_keyword[i] = {title:body.item[i].title, overview:result[0].tag, addr1:body.item[i].addr1, firstimage:body.item[i].firstimage};
                    if (result_search_keyword.length == body.item.length) {
                        res.json({
                            totalCount:totalCount,
                            pageNo:pageNo,
                            result_search_keyword: result_search_keyword
                        });
                    }
                });
            })(i);
        }
    });
}); 

/*app.post('/search/keyword', (req, res) => {
    var keyword = urlencode.encode(req.body.keyword, "UTF-8");
    var totalCount; var pageNo; var result_search_keyword = []; var jsontemp={};
    var sendres = {};
    
    var queryParams = kor_url + 'searchKeyword?ServiceKey=' + serviceKey + '&keyword='+keyword+'&arrange=P&numOfRows=10&MobileOS=AND&MobileApp=WeT&_type=json';
    request(queryParams, (err, resp, body) => {
        var re = JSON.parse(body);
        var use = re.response.body.items;
        if(err) {
            console.log(err);
        }
        for (var i=0; i <= use.length; i++) {
            result_search_keyword[i] = {"title":use.item[i].title, "overview":use.item[i].overview, "addr1":use.item[i].addr1, "firstimage":use.item[i].firstimage};
            console.log(use[i]);
        }
        
        console.log(use[0]);
    });
    
    res.json({
        "result_search_keyword": result_search_keyword,
        "totalCount":32
    });
});*/

/*app.post('/search/keyword', (req, res) => {
    var keyword = urlencode.encode(req.body.keyword, "UTF-8");
    var temp = {"result_search_keyword":[
		{
		 "title": "안면도자연휴양림",
		 "firstimage": "http:\/\/tong.visitkorea.or.kr\/cms\/resource\/70\/2031770_image2_1.jpg",
		 "addr1": "충청남도 태안군 안면읍 안면대로 3195-6",
		 "category": "관광지"
		},
		{
		 "title": "경기도자박물관",
		 "firstimage": "http:\/\/tong.visitkorea.or.kr\/cms\/resource\/08\/919408_image2_1.jpg",
		 "addr1": "경기도 광주시 곤지암읍 경충대로 727",
		 "category": "문화생활"
		}
 ],
 "totalCount":32,
 "pageNo":1
};
    
    var queryParams = kor_url + 'searchKeyword?ServiceKey=' + serviceKey + '&keyword='+keyword+'&arrange=P&numOfRows=10&MobileOS=AND&MobileApp=WeT&_type=json';
    request(queryParams, function(err, resp, body) {
        if(!err) {
            //지역은 사진이 없으므로 사진은 기본 이미지 넣어둔 채로 고정
            //console.log(body);
            //res.send(body);
        }
    });
    res.send(temp);
});*/

// OK
app.post('/area', (req, res) => {
    const outpuStr = (wait) => {
        setTimeout(() => {
            res.json({type:type, p_good_list:p_good_list, hot_place:hot_place, my_good_list:my_good_list, trip_record:trip_record});
    
        }, wait);
    };
    var email = req.body.email;
    var area_name = req.body.area_name;
    var inherence_number; var area_code;
    var tag_list = ["자연", "산"];
    var type;
    var p_good_list = []; var trip_record; var my_good_list = []; var hot_place = [];
    console.log(req.body);
    var area_code_sql = 'select area_code from area_code where area_name = ?';
    sql_param_query(area_code_sql, area_name, (result) => {
        area_code = result[0].area_code;
        
        var sql = 'select inherence_number from family where email = ?';
        sql_param_query(sql, email, (result1) => {
            inherence_number = result1[0].inherence_number;
            type = result1[0].type;
            var plan_sql = 'select trip_name, start_day, end_day from trip_plan where email = ? and area_code = ?';
            var startD = year.toString()+month.toString()+date.toString(); 
            sql_param_query(plan_sql, [email, area_code], (result2) => {
                for (var i = 0; i < result2.length; i++) {
                    (function(i) {
                        if(result2.length > 0) {
                            var dDay = 'D-';
                            var day = result2[i].start_day.substr(4,2);
                            day += '.'+result2[i].start_day.substr(6,2);
                            day += '~'+result2[i].end_day.substr(4,2)+'.';
                            day += result2[i].end_day.substr(6,2);
                            if(result2[i].start_day.substr(4,2) == month) {
                                cal = result2[i].start_day.substr(6,2) - date;
                                dDay += cal.toString();
                                if (cal == 0){
                                    dDay = 'D-Day';
                                } else if (cal<0) {
                                    cal *= -1;
                                    dDay ='D+'+cal.toString();
                                }
                            } else {
                                var date1 = moment([result2[i].start_day.substr(0,4),result2[i].start_day.substr(4,2), result2[i].start_day.substr(6,2)]);
                                var date2 = moment([year,month,date]);
                                //dDay = date1.diff(date2, 'days');
                                cal = result2[i].start_day.substr(6,2) - date +30;
                                dDay += cal.toString();
                                // 일정짜기 날짜에 갖다 씁시다
                                /*var lastDateOfMonth = ( new Date( result1[i].start_day.substr(0,4), result1[i].start_day.substr(4,2), 0) ).getDate();
                                cal = result1[i].end_day.substr(6,2) + lastDateOfMonth - result1[i].start_day.substr(6,2);
                                dDay += cal.toString();*/
                            }
                            trip_record = {trip_name:result2[0].trip_name, dDay:dDay, day:day};
                        } else {trip_record = {trip_name:'아직 여행 계획이 없습니다.'};}
                    })(i);
                }
                
                // 핫플레이스 => 좋아요한 관광지 중 지역코드로 검색하여 상위 10개 반환 반환
                var hot_place_sql = 'select tourist_code from good_tourist where area_code = ? group by tourist_code order by \'tourist_code\' limit 10';
                sql_param_query(hot_place_sql, area_code, (result3) => {
                    for(var i = 0; i < result3.length; i++) {
                        (function(i) {
                            inp = result3[i].tourist_code+'&areaCode='+result1[0].area_code;
                            detailCommon(inp, (body) => {
                                hot_place[i] = {title:body.item.title, firstimage:body.item.firstimage, tag_list:tag_list};
                            });
                        })(i);
                    }
                    
                    var sql = 'select * from family where inherence_number = ?';
                    sql_param_query(sql, inherence_number, (result7) => {
                        if (result7.length >= 2) {
                            //부모님이 좋아요한 지역 반환
                            var p_good_sql = 'select distinct tourist_code from good_tourist where inherence_number = ? and not email = ?';
                            sql_param_query(p_good_sql, [inherence_number, email], (result) => { 
                                for (var i =0; i < result.length; i++) {
                                    (function(i) {
                                        detailCommon(result[i].tourist_code, (body) => {
                                            p_good_list[i] = {title:body.item.title, 
                                                              firstimage:body.item.firstimage};
                                        });
                                    })(i);
                                }
                            });
                        } else {
                            p_good_list[0] = {title:'부모님을 추가해주세요'};
                        }
                    });
                    
                    var sql2 = 'select tourist_code from good_tourist where email = ? order by \'index\' desc';
                    sql_param_query(sql2, email, (result2) => { 
                        var cnt = 0;
                        for (var i =0; i < result2.length; i++) {
                            (function(i) {
                                detailCommon(result2[i].tourist_code, (body) => {
                                    cnt++;
                                    my_good_list[i] = {title:body.item.title, 
                                                  firstimage:body.item.firstimage};
                                });
                            })(i);
                        }
                    });
                });
            });
        });
        outpuStr(3000);
    });
});

// OK -관광지
app.post('/area/category', (req, res) => {
    var email = req.body.email;
    //if (req.body.email == null) {email = 'child@test.com';}
    var area_name = req.body.area_name;
    //if (req.body.area_name == 'null') {area_name = '제주도';}
    var category = req.body.category;
    //if (req.body.category == 'null') {category = '관광지';}
    var pageNo = req.body.pageNo;
    //if (req.body.pageNo == null) {pageNo = '1';}
    var area_list = [];
    var is_good = 0;
    var score = 4.0;
    var contentTypeId; var area_code; var totalCount; var out_pageNo;
    console.log(req.body);
    var sql = 'select contentTypeId from tag_list where tag = ?';
    sql_param_query(sql, category, (result1) => {
        contentTypeId = result1[0].contentTypeId;
        var sql2 = 'select area_code from area_code where area_name = ?'
        sql_param_query(sql2, area_name, (result2) => {
            area_code = result2[0].area_code;
            areaBasedList(contentTypeId, area_code, pageNo, (body) => {
                totalCount = body.totalCount; out_pageNo = body.pageNo;
                var tmp = 0;
                for (var i=0; i<body.item.length; i++) {
                    (function(i) {
                        var sql3 = 'select count(email) as c from good_tourist where email = ? and tourist_code = ?';
                        sql_param_query(sql3, [email, body.item[i].contentid], (result3) => {
                            tmp++;
                            if (result3[0].c == 1) {
                                is_good = 1;
                            }
                            area_list[i] = {title:body.item[i].title, tag_list:category, addr1:body.item[i].addr1, firstimage:body.item[i].firstimage, is_good:is_good, score:score};
                            if(tmp == body.item.length){
                                res.json({
                                    totalCount:totalCount,
                                    pageNo:pageNo,
                                    area_list: area_list
                                });

                            }
                        });
                    })(i);                    
                }
            });
        });
    });
});

// OK
app.post('/area/keyword', (req, res) => {
    var keyword = urlencode.encode(req.body.keyword, "UTF-8");
    var area_name = req.body.area_name;
    var area_code;
    var totalCount; var pageNo; var result_search_keyword = [];
    
    var sql = 'select * from area_code where area_name = ?';
    sql_param_query(sql, area_name, (result1) => {
        keyword += '&areaCode='+result1[0].area_code;
        searchKeyword(keyword, (body) => {
            totalCount = body.totalCount; pageNo = body.pageNo;
            if (body.item.length > 1) {
                for (var i=0; i < body.item.length; i++) {
                    (function(i) {
                        var sql2 = 'select * from tag_list where contentTypeId = ?';
                        sql_param_query(sql2, body.item[i].contenttypeid, (result2) => {
                            result_search_keyword[i] = {title:body.item[i].title, overview:result2[0].tag, addr1:body.item[i].addr1, firstimage:body.item[i].firstimage};
                            if (result_search_keyword.length == body.item.length) {
                                res.json({
                                    totalCount:totalCount,
                                    pageNo:pageNo,
                                    result_search_keyword: result_search_keyword
                                });
                            }
                        });
                    })(i);
                }
            } else {
                if (body.item) {
                    var sql2 = 'select * from tag_list where contentTypeId = ?';
                    sql_param_query(sql2, body.item.contenttypeid, (result2) => {
                        result_search_keyword[0] = {title:body.item.title, overview:result2[0].tag, addr1:body.item.addr1, firstimage:body.item.firstimage};
                        res.json({
                            totalCount:totalCount,
                            pageNo:pageNo,
                            result_search_keyword: result_search_keyword
                        });
                    });
                } else {
                    res.json({
                        totalCount:totalCount,
                        pageNo:pageNo
                    });
                }
            }
        });
    });
    
});

// OK
app.post('/trip/save', (req, res) => {
    var email = req.body.email;
    var trip_name = req.body.trip_name;
    var start_day = req.body.start_day;
    var end_day = req.body.end_day;
    var area_name = req.body.area_name;
    var family = req.body.family; //배열
    var inherence_number;
    var type;
    var area_code;
    
    var sql = 'select family.inherence_number, users.type from family join users on family.email = users.email where users.email = ?';
    sql_param_query(sql, email, (result) => {
        console.log(result);
        inherence_number = result[0].inherence_number;
        type = result[0].type;
        var sql = 'select area_code from area_code where area_name = ?';
        sql_param_query(sql, area_name, (result2) => {
            area_code = result2[0].area_code;
            var main_sql = 'insert into trip_plan (inherence_number, type, trip_name, start_day, end_day, area_code, email) value (?, ?, ?, ?, ?, ?, ?)';
            var params = [inherence_number, type, trip_name, start_day, end_day, area_code, email];
            connection.query(main_sql, params, function(err, result) {  
                if(err) {
                    console.log(err);
                }
            });
            
            var slqFam = 'select u.email, u.type from users as u join family as f on u.email = f.email where f.inherence_number = ? and u.name = ?';
            for (var i =0; i < family.length; i++) {
                (function(i){
                    sql_param_query(slqFam, [inherence_number, family[i]], (result3) => {
                        var params = [inherence_number, result3[0].type, trip_name, start_day, end_day, area_code, result3[0].email];
                        connection.query(main_sql, params, function(err, result) { 
                            if(err) {
                                console.log(err);
                            }
                        });
                    });
                })(i);
            }
            res.json({
                'code': 200,
                'message': "여행을 성공적으로 개설했습니다"
            });
        });
    });
});

// OK
app.post('/trip/create', (req, res) => { 
    var email = req.body.email;
    var family_list = [];
    
    
    var sql = 'select * from family where email = ?';
    sql_param_query(sql, email, (result1) => {
        var sql2 = 'select email from family where inherence_number = ? and not email = ?';
        sql_param_query(sql2, [result1[0].inherence_number, email], (result2) => {
            for (var i =0; i < result2.length; i++) {
                (function(i) {
                    var sql3 =  'select * from users where email = ?';
                    sql_param_query(sql3, result2[i].email, (result3) => {
                        family_list[i] = {name:result3[0].name, 
                                          profile:result3[0].profile};
                        if(family_list.length == result2.length) {
                            res.json({family_list:family_list});
                        }
                    });
                })(i);
            }
        });
    });
});


app.post('/trip/select_area', (req, res) => {
    var email = req.body.email;
    var good_area_list = [];
    
    var sql = 'select * from family where email = ?';
    sql_param_query(sql, email, (result1) => {
        var sql2 = 'select distinct area_code from good_area where inherence_number = ? and not email = ? order by \'index\' desc';
        sql_param_query(sql2, [result1[0].inherence_number, email], (result2) => {
            var cnt = 0;
            for (var i =0; i < result2.length; i++) {
                (function(i) {
                    var sql3 =  'select * from area_code where area_code = ?';
                    sql_param_query(sql3, result2[i].area_code, (result3) => {
                        var filename = './image/'+result3[0].area_name+'.jpg';
                        fs.readFile(filename, function(err, data) {
                            good_area_list[i] = {area_name:result3[0].area_name, firstimage:data};
                            if(good_area_list.length == result2.length) {
                                res.json({p_good_area:good_area_list});
                            }
                        });
                    });
                })(i);
            }
        });
    });    
});

//
app.post('/detail', (req, res) => {
    
});

app.post('/comment_add', (req, res) => {
    res.json({
    "code": 200,
    "message": "리뷰 등록 성공"
    });
});

app.post('/plan' , (req, res) => {
    var email = req.body.email;
    var trip_name = req.body.trip_name;
    var trip_paln_code; var type;
    var day = req.body.day;
    var sDay = '2021'+day.substr(0,2)+day.substr(3,2);
    var eDay = '2021'+day.substr(6,2)+day.substr(9,2);
    
    var sql = 'select * from trip_plan where trip_name = ? and start_day = ? end_day = ? and email = ?';
    sql_param_query(sql, [trip_name, sDay, eDay, email], (result1) => {
        
    });
});

app.post('/plan/add', (req, res) => {
    
});

app.post('/plan/add/update', (req, res) => {
    
});

app.post('/plan/title_update', (req, res) => {
    
});

app.post('/plan/memo', (req, res) => {
    
});


app.listen(3000, '192.168.123.7', function () {
    console.log('서버 실행 중...');
});



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
      urlencode     = require('urlencode');
const key = require('./keys/key');
const serviceKey = key.publicKey;
const searchKeyword = require('./utils/searchKeyword');
const detailCommon = require('./utils/detailCommon');
const searchFestival = require('./utils/searchFestival');
const defaultRequest = require('./utils/defaultRequest');
const sql_param_query = require('./utils/sql_param_query');
const sql_query = require('./utils/sql_query');

const app = express();
let today = new Date(); 
var year = today.getFullYear(); // 년도
var month = today.getMonth() + 1;  // 월
var date = today.getDate();  // 날짜

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
    console.log("로그인");
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
    var name;
    var type;
    var profile;
    var my_good = [];
    var tag_list = ["자연", "산"];
    var is_good = 1;
    
    var sql = 'select * from users where email = ?';
    
    sql_param_query(sql, email, (result) => {       
        name = result[0].name;
        type = result[0].type;
        profile = result[0].profile;
    });
        
    var sql2 = 'select distinct tourist_code from good_tourist where email = ? order by \'index\' desc';
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
                            name:name,
                            type:type,
                            profile:profile,
                            my_good:my_good
                        });
                    }
                });
            })(i);
        }
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
    
    var sql2 = 'select distinct tourist_code from good_tourist where email = ? order by \'index\' desc';
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
                            my_good:my_good
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
    
    var sql1 = 'select * from trip_plan where email = ?';
    sql_param_query(sql1, email, (result1) => {
        var tripNum = 0;
        for (var i =0; i < result1.length; i++) {
            (function(i) {
                var sql2 = 'select email from trip_plan where index = ? and not email = ?';
                sql_param_query(sql2, [result1[i].index,email], (result2) => {
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
    });
});

app.post('/main', (req, res) => {
    var email = req.body.email;
    var name; var profile; var type; var num_fam = 0;
    var inherence_number=75303885;
    var tag_list = ["자연", "산"];
    var p_good = []; var trip_record_list = []; var festival = []; var wet_good = []; var tv_tour = [];
    var attend_famliy = [];
    
    var sql = 'select * from family where email = ?';
    sql_param_query(sql, email, (result) => {
        inherence_number = result[0].inherence_number;
    });
    
    var sql = 'select * from users where email = ?';
    sql_param_query(sql, email, (result) => {     
        name = result[0].name;
        type = result[0].type;
        profile = result[0].profile;
    });
    
    var sql = 'select * from family where inherence_number = ?';
    sql_param_query(sql, inherence_number, (result) => {  
            if (result.length >= 2){
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
            //console.log(body);
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
            
            var sql1 = 'select * from trip_plan where email = ?';
            sql_param_query(sql1, email, (result1) => {
                var tripNum = 0;
                for (var i =0; i < result1.length; i++) {
                    (function(i) {
                        var sql2 = 'select email from trip_plan where index = ? and not email = ?';
                        sql_param_query(sql2, [result1[i].index,email], (result2) => {
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
                    })(i);
                }
            });
        
    });
    const outpuStr = (wait) => {
        setTimeout(() => {
            res.json({wet_good:wet_good, tv_tour:tv_tour, festival:festival, p_good:p_good, trip_record_list:trip_record_list});
    
        }, wait);
    };
    outpuStr(1000);
});

// OK
app.post('/search/keyword', (req, res) => {
    var keyword = urlencode.encode(req.body.keyword, "UTF-8");
    var totalCount; var pageNo; var result_search_keyword = [];
    
    searchKeyword(keyword, (body) => {
        //console.log(body);
        totalCount = body.totalCount; pageNo = body.pageNo;
        for (var i=0; i < body.item.length; i++) {
            result_search_keyword[i] = {title:body.item[i].title, overview:body.item[i].contenttypeid, addr1:body.item[i].addr1, firstimage:body.item[i].firstimage};
        }
        res.json({
            totalCount:totalCount,
            pageNo:pageNo,
            result_search_keyword: result_search_keyword
        });
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

app.post('/area', (req, res) => {
    var email = req.body.email;
    var area_name = req.body.area_name;
    var inherence_number;
    var code;
    var result_json;
    var temp = {"p_good_list":[
		{
		 "title": "안면도자연휴양림",
		 "firstimage": "http:\/\/tong.visitkorea.or.kr\/cms\/resource\/70\/2031770_image2_1.jpg",
		 "tag_list" : ["자연", "산"]
		},
		{
		 "title": "경기도자박물관",
		 "firstimage": "http:\/\/tong.visitkorea.or.kr\/cms\/resource\/08\/919408_image2_1.jpg",
		 "tag_list" : ["문화", "체험"]
		}
 ],
 "hot_place":[
		{
		 "title": "제주오성갈치조림",
		 "firstimage": "http://tong.visitkorea.or.kr/cms/resource/29/2755629_image2_1.jpg",
		 "tag_list" : ["음식점", "산"]
		},
		{
		 "title": "중문통갈치조림구이 색달식당",
		 "firstimage": "http://tong.visitkorea.or.kr/cms/resource/23/2755623_image2_1.jpg",
		 "tag_list" : ["자연", "산"]
		}
 ],
 "my_good_list":[
		{
		 "title": "제주오성갈치조림",
		 "firstimage": "http://tong.visitkorea.or.kr/cms/resource/29/2755629_image2_1.jpg",
		},
		{
		 "title": "중문통갈치조림구이 색달식당",
		 "firstimage": "http://tong.visitkorea.or.kr/cms/resource/23/2755623_image2_1.jpg",
		}
 ],
 "trip_record_list":[
		{
		 "trip_name":"사랑하는 엄빠의 제주여행",
		 "start_day":"20210802",
		 "end_day":"20210805",
		},
		{
		 "trip_name":"결혼기념 청주",
		 "start_day":"20210505",
		 "end_day":"20210507",
		},
		{
		 "trip_name":"여수가족여행",
		 "start_day":"20210305",
		 "end_day":"20210308",
		}
 ]
};
    
    var area_code_sql = 'select area_code from area_code where area_name = ?';
    connection.query(area_code_sql, area_name, function(err, result) {
        if(!err) {
            code = result[0].area_code;
        }
    });
    
    var sql = 'select inherence_number from family where email = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            inherence_number = result[0].inherence_number;
        }
    });
    
    // 여행계획에서 해당 지역 여행지가 있다면 출력 없으면 x
    var plan_sql = 'select trip_name, start_day, end_day where start_day >= ? order by index';
    connection.query(sql, year+month+date, function(err, result) {
        if(!err) {
            result_json.trip_plan = result;
        }
    });
    
    // 핫플레이스 => 좋아요한 관광지 중 지역코드로 검색하여 상위 10개 반환 반환
    var hot_place_sql = 'select tourist_code from (select tourist_code from good_tourist order by count(tourist_code) desc) where area code = ? group by tourist_code limit 10';
    connection.query(sql, code, function(err, result) {
        if(!err) {
            result_json.hot_place = result;
        }
    });
    
    // 나의 좋아요
    var my_good_sql = 'select tourist_code from tourist_good where area_code = ? and email = ? order by index;';
    connection.query(sql, [code, email], function(err, result) {
        if(!err) {
            result_json.my_good = result;
        }
    });
    
    // 부모님의 좋아요
    var my_good_sql = 'select tourist_code from tourist_good where area_code = ? and inherence_number = ? and not email = ? order by index;';
    connection.query(sql, [code, inherence_number, email], function(err, result) {
        if(!err) {
            result_json.p_good = result;
        }
        //res.send(result_json);
    });
    res.send(temp);    
});

app.post('/area/category', (req, res) => {
    var temp = {
	"p_good_area": [
    {
			"title": "휴애리자연생활공원",
			"tag_list" : ["자연", "산"],
			"addr1": "제주특별자치도 서귀포시 남원읍 신례동로 256",
			"firstimage": "http://tong.visitkorea.or.kr/cms/resource/47/2615547_image2_1.bmp",
			"is_good": 1,
			"score": 4.0
		}
	]
};
    res.send(temp);
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
            //console.log(body);
            totalCount = body.totalCount; pageNo = body.pageNo;
            for (var i=0; i < body.item.length; i++) {
                result_search_keyword[i] = {title:body.item[i].title, overview:body.item[i].contenttypeid, addr1:body.item[i].addr1, firstimage:body.item[i].firstimage};
            }
            res.json({
                totalCount:totalCount,
                pageNo:pageNo,
                result_search_keyword: result_search_keyword
            });
        });
    });
    
});

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
    
    var sql = 'select inherence_number from family where email = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            inherence_number = result[0].inherence_number;
        }
    });
    var sql = 'select type from users where email = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            type = result[0].type;
        }
    });
    var sql = 'select area_code from family where area_name = ?';
    connection.query(sql, email, function(err, result) {    
        if(!err) {
            inherence_number = result[0].inherence_number;
        }
    });
    
    
    var main_sql = 'insert into trip_plan (inherence_number, type, trip_name, start_day, end_day, area_code, email) value (?, ?, ?, ?, ?, ?, ?)';
    for (var i=0; i <= family.length; i++) {
        
    }
    res.json({
        'code': 200,
        'message': "여행을 성공적으로 개설했습니다"
    });
});

// /mypage/add_family 랑 똑같음
app.post('/trip/create', (req, res) => { 
    var email = req.body.email;
    var sql_result;
    var send_result = {};
    var inherence_number;
    var name;
    var temp = {
	"family_list": [
    {
	    "name": "테스트용",
			"profie": "aaa.jpg"
		},
    {
			"name": "전순화",
			"profie": "bbb.jpg"
		}
	]
};
    
    var sql = 'select * from family where email = ?';
    connection.query(sql, email, function(err, result1) { 
        inherence_number = result1[0].inherence_number;
        var sql2 = 'select email from family where inherence_number = ? and not email = ?';
        connection.query(sql2, [result1[0].inherence_number, email], function(err, result2) {
            if(!err){
                for (var i =0; i < result2.length; i++) {
                    var sql3 =  'select name from users where email = ?';
                    connection.query(sql3, result2[i].email, function(err, result) {
                        send_result.name = result[0].name;
                        //res.json(send_result); // json처리하나 result자체로 보내나 똑같은 json형식임
                    });
                }
            } 
        });
    });
    res.send(temp);
});

app.post('/trip/select_area', (req, res) => {
    var temp = {
	"p_good_area": [
    {
			"area_name": "전라남도",
			"firstimage": "https://cdn.pixabay.com/photo/2016/09/01/08/24/smiley-1635449_1280.png"
		},
    {
			"area_name": "제주도",
			"firstimage": "https://cdn.pixabay.com/photo/2016/09/01/08/24/smiley-1635449_1280.png"
		}
	]
};
    res.send(temp);
});

//보류
app.post('/detail', (req, res) => {
    
});

app.post('/comment_add', (req, res) => {
    res.json({
    "code": 200,
    "message": "리뷰 등록 성공"
    });
});

app.post('/plan' , (req, res) => {
    
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



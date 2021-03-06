var _ = require('underscore');
var Filter = require('../core/filter.js');
var DAL = require('../core/dal.js');
var DataNormalizer = require('../core/data_normalizer.js');
var Groups = require('../core/groups.js');
var removeQoutes = DataNormalizer.removeQoutes;
var config = require('../config')
var jade = require('jade');
var fs = require('fs');
var async = require('async');

var Dictionary =  require('../core/dictionary.js')
var dictionary = Dictionary.dictionary;
var translate = Dictionary.translate;
var plurals = Dictionary.plurals;



function createTitle(filter){

                                                
  var title = "";
  var firstInTitle ="";
 
  var onlyManagingBody = 0;
  var onlyFundName = 0;
  var nothingIsChosen = 0;
  var addTheWordNechasim =0;
  var instrumentNameIsChosen = 0;
  var onlyIssuer = 0;
  
  var numberOfChosenFilters = 0; 
  
  var managing_body = translate(filter.getConstraintData('managing_body'));
  var fund_name = filter.getConstraintData('fund_name');
  var instrument_name = filter.getConstraintData('instrument_name');
  var asset_type = filter.getConstraintData('asset_type');
  var liquidity = filter.getConstraintData('liquidity');
  var reference_index = filter.getConstraintData('reference_index');
  var issuer = filter.getConstraintData('issuer');
  var rating = filter.getConstraintData('rating');
  var activity_industry = filter.getConstraintData('activity_industry');
  var currency = filter.getConstraintData('currency');
  var instrument_id = filter.getConstraintData('instrument_id');
  var industry = filter.getConstraintData('industry');

 
  if (asset_type!="") {numberOfChosenFilters=numberOfChosenFilters+1; if (firstInTitle=="") {firstInTitle="asset_type";};};
  if (reference_index!="") {numberOfChosenFilters=numberOfChosenFilters+1; if (firstInTitle=="") {firstInTitle="reference_index";};};
  if (liquidity!="") {numberOfChosenFilters=numberOfChosenFilters+1; if (firstInTitle=="") {firstInTitle="liquidity";};};
  if (issuer!="") {numberOfChosenFilters=numberOfChosenFilters+1; if (firstInTitle=="") {firstInTitle="issuer";};};
  if (rating!="") {numberOfChosenFilters=numberOfChosenFilters+1; if (firstInTitle=="") {firstInTitle="rating";};};
  if (activity_industry!="") {numberOfChosenFilters=numberOfChosenFilters+1; if (firstInTitle=="") {firstInTitle="activity_industry";};};
  if (currency!="") {numberOfChosenFilters=numberOfChosenFilters+1; if (firstInTitle=="") {firstInTitle="currency";};};
  
  
  
  // nothing is chosen by the user
  if (managing_body== "" && liquidity=="" && industry=="" && currency=="" && rating=="" && instrument_id==""  ) {
        nothingIsChosen = 1; 
  }  
  // only managing body is active 
  if (managing_body!= "" && filter.getDrillDownDepth() == 1 ) {
        onlyManagingBody = 1; 
  }
  // only issuer is active 
  if (issuer!="" && liquidity=="" && industry=="" && activity_industry=="" && currency=="" && rating=="" && asset_type=="" && instrument_id=="" && fund_name=="" && instrument_name=="") {
        onlyIssuer = 1; 
  }  
  
  
  if (fund_name!= "" &&  filter.getDrillDownDepth() == 1 ||
      fund_name!= "" && managing_body!= "" &&
       filter.getDrillDownDepth() == 2 ) {
        onlyFundName = 1; 
  }
  
  // If managing body or instrument is not chosen add the word 'instruments' (nechasim) to have a NOSSE 
  //if (managing_body== "" && liquidity=="" ) {
  if (liquidity=="" && asset_type =="" && !onlyManagingBody) {
        addTheWordNechasim = 1;  
  }
  

  title +=  (managing_body != "")?onlyManagingBody? managing_body : managing_body + " <i class=\"fa fa-angle-left\"></i>  " : "שוק הפנסיה";
  title +=  (instrument_name != "")? " " + instrument_name:"";

  if (instrument_name=="") {
	  title+= (asset_type != "")?((firstInTitle=="asset_type")?((numberOfChosenFilters==1)? " ב" : "") : ((numberOfChosenFilters==1)? "" : " ב")) + asset_type + " " : "" ;
	  title+= (reference_index != "")?((firstInTitle=="reference_index")?((numberOfChosenFilters==1)? " ב" : "") : ((numberOfChosenFilters==1)? "" : " ב")) + "תעודות סל על מדד " + reference_index + " " : "" ;
	  title+= (liquidity != "")?((firstInTitle=="liquidity")?((numberOfChosenFilters==1)? " ב" : "") : ((numberOfChosenFilters==1)? "" : " ב")) + "רמת נזילות " + liquidity + " " : "" ;
	  title+= (issuer != "")?((firstInTitle=="issuer")?((numberOfChosenFilters==1)? "" : "") : ((numberOfChosenFilters==1)? "" : " של ")) + issuer + " " : "" ;
	  title+= (rating != "")?((firstInTitle=="rating")?((numberOfChosenFilters==1)? " ב" : "") : ((numberOfChosenFilters==1)? "" : " ב")) + "דירוג " + rating + " " : "" ;
	  title+= (activity_industry != "")?((firstInTitle=="activity_industry")?((numberOfChosenFilters==1)? " ב" : "") : ((numberOfChosenFilters==1)? "" : " ב")) + "ענף ה" + activity_industry + " " : "" ;
	  title+= (currency != "")?((firstInTitle=="currency")?((numberOfChosenFilters==1)? " ב" : "") : ((numberOfChosenFilters==1)? "" : " ב")) + translate(currency) + " " : "" ;
  }

  title = title.replace("null","לא נמצא בקטגוריה");


  return title;  
}

function getReportType(filter){
  if (  (filter.getDrillDownDepth() == 0 ) || 
        (filter.getDrillDownDepth() == 1 && filter.hasConstraint("managing_body")) ||
        (filter.getDrillDownDepth() == 1 && filter.hasConstraint("fund_name")) ||
        (filter.getDrillDownDepth() == 2 && 
        filter.hasConstraint("managing_body") && 
        filter.hasConstraint("fund_name"))
        ){
      return "managing_body";
  }
  else{
    return "investment";
  }

}



exports.investments = function(req, res){

  
  //create filter from request (search string)
  var filter = Filter.fromGetRequest(req);
  var group_by = filter.getConstraintData('group_by')[0];

  if (group_by == undefined){
    res.end("group_by is missing");
  }

  //check for debug flag  
  var debug = filter.getConstraintData("debug")[0];
  filter.removeField("debug");



  if (!filter.hasConstraint("report_year")){
      filter.addConstraint("report_year",config.current_year);
  }

  if (!filter.hasConstraint("report_qurater")){
      filter.addConstraint("report_qurater", config.current_quarter);
  }


  var report_year = filter.getConstraintData("report_year")[0];
  var report_qurater = filter.getConstraintData("report_qurater")[0];

  var lastQuarters = DataNormalizer.getLastQuarters(report_year, report_qurater,4);

  //group filter by quarters
  DAL.groupByInvestments(filter,
      function(err, groups, select){


        //sum groups to quarters
        quartersSums = _.groupBy(groups,
              function(v2,k2,l2){
                return v2['report_year']+"_"+v2['report_qurater'];
              });

        _.each(quartersSums,
          function(v,k,l){
              quartersSums[k] = _.reduce(quartersSums[k],function(memo, group){ return memo + Number(group['fair_value']); }, 0);
        });



        //group results by group_field (e.g. issuer)
        groups = _.groupBy(groups, group_by);


        // group result items by year and quarter
        _.each(groups,
          function(v,k,l){
              groups[k] = _.groupBy(groups[k],
                  function(v2,k2,l2){
                    return v2['report_year']+"_"+v2['report_qurater'];
                  }
          );
        });


        res.render('investments',{
            filter: filter,
            query:select,
            translate: translate,
            convertNumberToWords:DataNormalizer.convertNumberToWords,
            escapeSpecialChars: DataNormalizer.escapeSpecialChars,  
            escapeJSLink: DataNormalizer.escapeJSLink,
            rfc3986EncodeURIComponent: DataNormalizer.rfc3986EncodeURIComponent,  
            removeQoutes: DataNormalizer.removeQoutes,
            debug: debug == 'true',
            req: req,
            group_by: group_by,
            plurals: plurals,
            groups: groups,
            lastQuarters: lastQuarters,
            quartersSums: quartersSums
          });

      } 
  );

}


exports.portfolio = function(req, res){

  //create filter from request (search string)
  var filter = Filter.fromGetRequest(req);
  
  //check for debug flag  
  var debug = filter.getConstraintData("debug")[0];
  filter.removeField("debug");

  if (!filter.hasConstraint("report_year") || 
    !filter.hasConstraint("report_qurater")){  
      filter.addConstraint("report_year",config.current_year);
      filter.addConstraint("report_qurater", config.current_quarter);
      res.redirect("/portfolio"+filter.toQueryString());
  }


  var asset_type = filter.getConstraintData("asset_type")[0];
  var report_year = filter.getConstraintData("report_year")[0];
  var report_qurater = filter.getConstraintData("report_qurater")[0];
  var managing_body = filter.getConstraintData('managing_body')[0];  


  var lastQuarters = DataNormalizer.getLastQuarters(report_year, report_qurater, 4);
  
  //special case for managing body page
  //where we want to show precentage of total market sum
  var totalPensionFundFilter = filter.clone();
  var drillDownDepth = filter.getDrillDownDepth();


  if (totalPensionFundFilter.hasConstraint("managing_body") && 
        drillDownDepth == 1){
      totalPensionFundFilter.removeField("managing_body");
  }




  async.parallel([
      function(callback){ 
          //relative to total fund or current managing_body
          DAL.groupByManagingBody(totalPensionFundFilter,callback);
      },
      function(callback){ 
          //group filter by quarters
          DAL.groupByQuarters(filter, callback);
      },
      function(callback){ 
          //get portfolio data
          DAL.groupByPortfolio(filter, callback);
      },
      function(callback){ 
          DAL.getFundsByManagingBody(managing_body, callback);
      }
    ], 
    function(err,results){

      if (err){
        console.log(err);
        res.end("Err: "+err);
        return;
      }

      var totalPensionFundQuarters = results[0][0];
      var totalPensionFundQuery = results[0][1];

      var quarters = results[1][0];
      var quartersQuery = results[1][1];

      var groups = results[2];

      var funds = results[3][0];
      var fundsQuery = results[3][1];

      //group results by group_field (e.g. issuer)
      _.each(groups, 
          function(value,key,list){
              value['result'] = 
                  _.groupBy(value['result'],value['group_field'])
          }
      );


      //group result items by year and quarter
      _.each(groups,
        function(v,k,l){
        _.each(v['result'],
          function(v1,k1,l1){ 
            l1[k1] = _.groupBy(l1[k1],
                function(v2,k2,l2){
                  return v2['report_year']+"_"+v2['report_qurater'];
                }
            )
          }
        );
      });

      quarters = _.groupBy(quarters,
                function(v2,k2,l2){
                  return v2['report_year']+"_"+v2['report_qurater'];
                });
          
      totalPensionFundQuarters = _.groupBy(totalPensionFundQuarters,
                function(v2,k2,l2){
                  return v2['report_year']+"_"+v2['report_qurater'];
                });

    //fill up missing quarters with sum 0
    if (Object.keys(quarters).length < 4 || 
      Object.keys(totalPensionFundQuarters).length < 4){
      for(var q = 0; q < 4; q++){
      
        if (quarters[lastQuarters[q].str] == undefined){
          quarters[lastQuarters[q].str] = [{"fair_value":"0"}];
        }

        if (totalPensionFundQuarters[lastQuarters[q].str] == undefined){
          totalPensionFundQuarters[lastQuarters[q].str] = [{"fair_value":"0"}];
        }

      }
    }

    var title = createTitle(filter);
    

    res.render('portfolio',{
        filter: filter,
        total_sum_words:DataNormalizer.convertNumberToWords(quarters[lastQuarters[0].str][0]['fair_value']),      // total sum normalized (scaled)
        groups: groups,
        convertNumberToWords:DataNormalizer.convertNumberToWords,
        translate: translate,
        escapeSpecialChars: DataNormalizer.escapeSpecialChars,  
        rfc3986EncodeURIComponent: DataNormalizer.rfc3986EncodeURIComponent,  
        removeQoutes: DataNormalizer.removeQoutes,
        debug: debug == 'true',
        req: req,
        lastQuarters: lastQuarters,
        report_qurater: report_qurater,
        report_year: report_year,
        totalPensionFundQuarters: totalPensionFundQuarters,
        totalPensionFundQuery: totalPensionFundQuery,
        plurals: plurals,
        totalPensionFundQuery:totalPensionFundQuery,
        quarters:quarters,
        quartersQuery: quartersQuery,
        funds:funds,
        fundsQuery: fundsQuery,
        report_type: getReportType(filter),
        report_title : title,
        drillDown : filter.getDrillDown(),
        title: title.replace("<i class=\"fa fa-angle-left\"></i>",">"),
        Filter: Filter,
        dictionary : dictionary,
        getReportType: getReportType,
        createTitle: createTitle,
        escapeJSLink: DataNormalizer.escapeJSLink,
        getLastQuarters: DataNormalizer.getLastQuarters,
        current_year: config.current_year,
        current_quarter: config.current_quarter
      });

});


}

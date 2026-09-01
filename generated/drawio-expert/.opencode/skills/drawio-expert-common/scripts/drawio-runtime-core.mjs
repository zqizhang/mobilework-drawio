// @bun
import{promises as y}from"fs";import{createHash as F8,randomBytes as vJ,randomUUID as $1}from"crypto";import{createServer as SG}from"http";import{createConnection as IG}from"net";import E from"path";var $Q=":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040",HQ="[:A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD]["+$Q+"]*",VQ=new RegExp("^"+HQ+"$");function A6(J,Q){let W=[],Y=Q.exec(J);while(Y){let U=[];U.startIndex=Q.lastIndex-Y[0].length;let G=Y.length;for(let Z=0;Z<G;Z++)U.push(Y[Z]);W.push(U),Y=Q.exec(J)}return W}var q8=function(J){let Q=VQ.exec(J);return!(Q===null||typeof Q>"u")};function J7(J){return typeof J<"u"}var h5=["hasOwnProperty","toString","valueOf","__defineGetter__","__defineSetter__","__lookupGetter__","__lookupSetter__"],T6=["__proto__","constructor","prototype"];var qQ={allowBooleanAttributes:!1,unpairedTags:[]};function E6(J,Q){Q=Object.assign({},qQ,Q);let W=[],Y=!1,U=!1;if(J[0]==="\uFEFF")J=J.substr(1);for(let G=0;G<J.length;G++)if(J[G]==="<"&&J[G+1]==="?"){if(G+=2,G=W7(J,G),G.err)return G}else if(J[G]==="<"){let Z=G;if(G++,J[G]==="!"){G=Y7(J,G);continue}else{let K=!1;if(J[G]==="/")K=!0,G++;let $="";for(;G<J.length&&J[G]!==">"&&J[G]!==" "&&J[G]!=="\t"&&J[G]!==`
`&&J[G]!=="\r";G++)$+=J[G];if($=$.trim(),$[$.length-1]==="/")$=$.substring(0,$.length-1),G--;if(!RQ($)){let X;if($.trim().length===0)X="Invalid space after '<'.";else X="Tag '"+$+"' is an invalid name.";return r("InvalidTag",X,UJ(J,G))}let z=jQ(J,G);if(z===!1)return r("InvalidAttr","Attributes for '"+$+"' have open quote.",UJ(J,G));let F=z.value;if(G=z.index,F[F.length-1]==="/"){let X=G-F.length;F=F.substring(0,F.length-1);let H=G7(F,Q);if(H===!0)Y=!0;else return r(H.err.code,H.err.msg,UJ(J,X+H.err.line))}else if(K)if(!z.tagClosed)return r("InvalidTag","Closing tag '"+$+"' doesn't have proper closing.",UJ(J,G));else if(F.trim().length>0)return r("InvalidTag","Closing tag '"+$+"' can't have attributes or invalid starting.",UJ(J,Z));else if(W.length===0)return r("InvalidTag","Closing tag '"+$+"' has not been opened.",UJ(J,Z));else{let X=W.pop();if($!==X.tagName){let H=UJ(J,X.tagStartPos);return r("InvalidTag","Expected closing tag '"+X.tagName+"' (opened in line "+H.line+", col "+H.col+") instead of closing tag '"+$+"'.",UJ(J,Z))}if(W.length==0)U=!0}else{let X=G7(F,Q);if(X!==!0)return r(X.err.code,X.err.msg,UJ(J,G-F.length+X.err.line));if(U===!0)return r("InvalidXml","Multiple possible root nodes found.",UJ(J,G));else if(Q.unpairedTags.indexOf($)!==-1);else W.push({tagName:$,tagStartPos:Z});Y=!0}for(G++;G<J.length;G++)if(J[G]==="<")if(J[G+1]==="!"){G++,G=Y7(J,G);continue}else if(J[G+1]==="?"){if(G=W7(J,++G),G.err)return G}else break;else if(J[G]==="&"){let X=OQ(J,G);if(X==-1)return r("InvalidChar","char '&' is not expected.",UJ(J,G));G=X}else if(U===!0&&!Q7(J[G]))return r("InvalidXml","Extra text at the end",UJ(J,G));if(J[G]==="<")G--}}else{if(Q7(J[G]))continue;return r("InvalidChar","char '"+J[G]+"' is not expected.",UJ(J,G))}if(!Y)return r("InvalidXml","Start tag expected.",1);else if(W.length==1)return r("InvalidTag","Unclosed tag '"+W[0].tagName+"'.",UJ(J,W[0].tagStartPos));else if(W.length>0)return r("InvalidXml","Invalid '"+JSON.stringify(W.map((G)=>G.tagName),null,4).replace(/\r?\n/g,"")+"' found.",{line:1,col:1});return!0}function Q7(J){return J===" "||J==="\t"||J===`
`||J==="\r"}function W7(J,Q){let W=Q;for(;Q<J.length;Q++)if(J[Q]=="?"||J[Q]==" "){let Y=J.substr(W,Q-W);if(Q>5&&Y==="xml")return r("InvalidXml","XML declaration allowed only at the start of the document.",UJ(J,Q));else if(J[Q]=="?"&&J[Q+1]==">"){Q++;break}else continue}return Q}function Y7(J,Q){if(J.length>Q+5&&J[Q+1]==="-"&&J[Q+2]==="-"){for(Q+=3;Q<J.length;Q++)if(J[Q]==="-"&&J[Q+1]==="-"&&J[Q+2]===">"){Q+=2;break}}else if(J.length>Q+8&&J[Q+1]==="D"&&J[Q+2]==="O"&&J[Q+3]==="C"&&J[Q+4]==="T"&&J[Q+5]==="Y"&&J[Q+6]==="P"&&J[Q+7]==="E"){let W=1;for(Q+=8;Q<J.length;Q++)if(J[Q]==="<")W++;else if(J[Q]===">"){if(W--,W===0)break}}else if(J.length>Q+9&&J[Q+1]==="["&&J[Q+2]==="C"&&J[Q+3]==="D"&&J[Q+4]==="A"&&J[Q+5]==="T"&&J[Q+6]==="A"&&J[Q+7]==="["){for(Q+=8;Q<J.length;Q++)if(J[Q]==="]"&&J[Q+1]==="]"&&J[Q+2]===">"){Q+=2;break}}return Q}var LQ='"',BQ="'";function jQ(J,Q){let W="",Y="",U=!1;for(;Q<J.length;Q++){if(J[Q]===LQ||J[Q]===BQ)if(Y==="")Y=J[Q];else if(Y!==J[Q]);else Y="";else if(J[Q]===">"){if(Y===""){U=!0;break}}W+=J[Q]}if(Y!=="")return!1;return{value:W,index:Q,tagClosed:U}}var MQ=new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`,"g");function G7(J,Q){let W=A6(J,MQ),Y={};for(let U=0;U<W.length;U++){if(W[U][1].length===0)return r("InvalidAttr","Attribute '"+W[U][2]+"' has no space in starting.",u5(W[U]));else if(W[U][3]!==void 0&&W[U][4]===void 0)return r("InvalidAttr","Attribute '"+W[U][2]+"' is without value.",u5(W[U]));else if(W[U][3]===void 0&&!Q.allowBooleanAttributes)return r("InvalidAttr","boolean attribute '"+W[U][2]+"' is not allowed.",u5(W[U]));let G=W[U][2];if(!CQ(G))return r("InvalidAttr","Attribute '"+G+"' is an invalid name.",u5(W[U]));if(!Object.prototype.hasOwnProperty.call(Y,G))Y[G]=1;else return r("InvalidAttr","Attribute '"+G+"' is repeated.",u5(W[U]))}return!0}function PQ(J,Q){let W=/\d/;if(J[Q]==="x")Q++,W=/[\da-fA-F]/;for(;Q<J.length;Q++){if(J[Q]===";")return Q;if(!J[Q].match(W))break}return-1}function OQ(J,Q){if(Q++,J[Q]===";")return-1;if(J[Q]==="#")return Q++,PQ(J,Q);let W=0;for(;Q<J.length;Q++,W++){if(J[Q].match(/\w/)&&W<20)continue;if(J[Q]===";")break;return-1}return Q}function r(J,Q,W){return{err:{code:J,msg:Q,line:W.line||W,col:W.col}}}function CQ(J){return q8(J)}function RQ(J){return q8(J)}function UJ(J,Q){let W=J.substring(0,Q).split(/\r?\n/);return{line:W.length,col:W[W.length-1].length+1}}function u5(J){return J.startIndex+J[1].length}var L8={cent:"\xA2",pound:"\xA3",curren:"\xA4",yen:"\xA5",euro:"\u20AC",dollar:"$",fnof:"\u0192",inr:"\u20B9",af:"\u060B",birr:"\u1265\u122D",peso:"\u20B1",rub:"\u20BD",won:"\u20A9",yuan:"\xA5",cedil:"\xB8"};var g5={amp:"&",apos:"'",gt:">",lt:"<",quot:'"'},B8={nbsp:"\xA0",copy:"\xA9",reg:"\xAE",trade:"\u2122",mdash:"\u2014",ndash:"\u2013",hellip:"\u2026",laquo:"\xAB",raquo:"\xBB",lsquo:"\u2018",rsquo:"\u2019",ldquo:"\u201C",rdquo:"\u201D",bull:"\u2022",para:"\xB6",sect:"\xA7",deg:"\xB0",frac12:"\xBD",frac14:"\xBC",frac34:"\xBE"};var j5=Object.freeze({ALLOW:"allow",BLOCK:"block",THROW:"throw"}),AQ=new Set("!?\\\\/[]$%{}^&*()<>|+");function U7(J){if(J[0]==="#")throw Error(`[EntityReplacer] Invalid character '#' in entity name: "${J}"`);for(let Q of J)if(AQ.has(Q))throw Error(`[EntityReplacer] Invalid character '${Q}' in entity name: "${J}"`);return J}function m5(...J){let Q=Object.create(null);for(let W of J){if(!W)continue;for(let Y of Object.keys(W)){let U=W[Y];if(typeof U==="string")Q[Y]=U;else if(U&&typeof U==="object"&&U.val!==void 0){let G=U.val;if(typeof G==="string")Q[Y]=G}}}return Q}var eJ="external",N6="base",j8="all";function TQ(J){if(!J||J===eJ)return new Set([eJ]);if(J===j8)return new Set([j8]);if(J===N6)return new Set([N6]);if(Array.isArray(J))return new Set(J);return new Set([eJ])}var FJ=Object.freeze({allow:0,leave:1,remove:2,throw:3}),EQ=new Set([9,10,13]);function NQ(J){if(!J)return{xmlVersion:1,onLevel:FJ.allow,nullLevel:FJ.remove};let Q=J.xmlVersion===1.1?1.1:1,W=FJ[J.onNCR]??FJ.allow,Y=FJ[J.nullNCR]??FJ.remove,U=Math.max(Y,FJ.remove);return{xmlVersion:Q,onLevel:W,nullLevel:U}}class c5{constructor(J={}){this._limit=J.limit||{},this._maxTotalExpansions=this._limit.maxTotalExpansions||0,this._maxExpandedLength=this._limit.maxExpandedLength||0,this._postCheck=typeof J.postCheck==="function"?J.postCheck:(W)=>W,this._limitTiers=TQ(this._limit.applyLimitsTo??eJ),this._numericAllowed=J.numericAllowed??!0,this._baseMap=m5(g5,J.namedEntities||null),this._externalMap=Object.create(null),this._inputMap=Object.create(null),this._totalExpansions=0,this._expandedLength=0,this._removeSet=new Set(J.remove&&Array.isArray(J.remove)?J.remove:[]),this._leaveSet=new Set(J.leave&&Array.isArray(J.leave)?J.leave:[]);let Q=NQ(J.ncr);this._ncrXmlVersion=Q.xmlVersion,this._ncrOnLevel=Q.onLevel,this._ncrNullLevel=Q.nullLevel,this._onExternalEntity=typeof J.onExternalEntity==="function"?J.onExternalEntity:null,this._onInputEntity=typeof J.onInputEntity==="function"?J.onInputEntity:null}_applyRegistrationHook(J,Q,W,Y){if(!J)return!0;let U=J(Q,W);if(U===j5.BLOCK)return!1;if(U===j5.THROW)throw Error(`[EntityDecoder] Registration of ${Y} entity "&${Q};" was rejected by hook`);return!0}setExternalEntities(J){if(J)for(let Y of Object.keys(J))U7(Y);if(!this._onExternalEntity){this._externalMap=m5(J);return}let Q=m5(J),W=Object.create(null);for(let[Y,U]of Object.entries(Q))if(this._applyRegistrationHook(this._onExternalEntity,Y,U,"external"))W[Y]=U;this._externalMap=W}addExternalEntity(J,Q){if(U7(J),typeof Q==="string"&&Q.indexOf("&")===-1){if(this._applyRegistrationHook(this._onExternalEntity,J,Q,"external"))this._externalMap[J]=Q}}addInputEntities(J){if(this._totalExpansions=0,this._expandedLength=0,!this._onInputEntity){this._inputMap=m5(J);return}let Q=m5(J),W=Object.create(null);for(let[Y,U]of Object.entries(Q))if(this._applyRegistrationHook(this._onInputEntity,Y,U,"input"))W[Y]=U;this._inputMap=W}reset(){return this._inputMap=Object.create(null),this._totalExpansions=0,this._expandedLength=0,this}setXmlVersion(J){this._ncrXmlVersion=J===1.1?1.1:1}decode(J){if(typeof J!=="string"||J.length===0)return J;if(J.indexOf("&")===-1)return J;let Q=J,W=[],Y=J.length,U=0,G=0,Z=this._maxTotalExpansions>0,K=this._maxExpandedLength>0,$=Z||K;while(G<Y){if(J.charCodeAt(G)!==38){G++;continue}let F=G+1;while(F<Y&&J.charCodeAt(F)!==59&&F-G<=32)F++;if(F>=Y||J.charCodeAt(F)!==59){G++;continue}let X=J.slice(G+1,F);if(X.length===0){G++;continue}let H,V;if(this._removeSet.has(X)){if(H="",V===void 0)V=eJ}else if(this._leaveSet.has(X)){G++;continue}else if(X.charCodeAt(0)===35){let q=this._resolveNCR(X);if(q===void 0){G++;continue}H=q,V=N6}else{let q=this._resolveName(X);H=q?.value,V=q?.tier}if(H===void 0){G++;continue}if(G>U)W.push(J.slice(U,G));if(W.push(H),U=F+1,G=U,$&&this._tierCounts(V)){if(Z){if(this._totalExpansions++,this._totalExpansions>this._maxTotalExpansions)throw Error(`[EntityReplacer] Entity expansion count limit exceeded: ${this._totalExpansions} > ${this._maxTotalExpansions}`)}if(K){let q=H.length-(X.length+2);if(q>0){if(this._expandedLength+=q,this._expandedLength>this._maxExpandedLength)throw Error(`[EntityReplacer] Expanded content length limit exceeded: ${this._expandedLength} > ${this._maxExpandedLength}`)}}}}if(U<Y)W.push(J.slice(U));let z=W.length===0?J:W.join("");return this._postCheck(z,Q)}_tierCounts(J){if(this._limitTiers.has(j8))return!0;return this._limitTiers.has(J)}_resolveName(J){if(J in this._inputMap)return{value:this._inputMap[J],tier:eJ};if(J in this._externalMap)return{value:this._externalMap[J],tier:eJ};if(J in this._baseMap)return{value:this._baseMap[J],tier:N6};return}_classifyNCR(J){if(J===0)return this._ncrNullLevel;if(J>=55296&&J<=57343)return FJ.remove;if(this._ncrXmlVersion===1){if(J>=1&&J<=31&&!EQ.has(J))return FJ.remove}return-1}_applyNCRAction(J,Q,W){switch(J){case FJ.allow:return String.fromCodePoint(W);case FJ.remove:return"";case FJ.leave:return;case FJ.throw:throw Error(`[EntityDecoder] Prohibited numeric character reference &${Q}; (U+${W.toString(16).toUpperCase().padStart(4,"0")})`);default:return String.fromCodePoint(W)}}_resolveNCR(J){let Q=J.charCodeAt(1),W;if(Q===120||Q===88)W=parseInt(J.slice(2),16);else W=parseInt(J.slice(1),10);if(Number.isNaN(W)||W<0||W>1114111)return;let Y=this._classifyNCR(W);if(!this._numericAllowed&&Y<FJ.remove)return;let U=Y===-1?this._ncrOnLevel:Math.max(this._ncrOnLevel,Y);return this._applyNCRAction(U,J,W)}}var z7=(J)=>{if(h5.includes(J))return"__"+J;return J},DQ={preserveOrder:!1,attributeNamePrefix:"@_",attributesGroupName:!1,textNodeName:"#text",ignoreAttributes:!0,removeNSPrefix:!1,allowBooleanAttributes:!1,parseTagValue:!0,parseAttributeValue:!1,trimValues:!0,cdataPropName:!1,numberParseOptions:{hex:!0,leadingZeros:!0,eNotation:!0,unicode:!1},tagValueProcessor:function(J,Q){return Q},attributeValueProcessor:function(J,Q){return Q},stopNodes:[],alwaysCreateTextNode:!1,isArray:()=>!1,commentPropName:!1,unpairedTags:[],processEntities:!0,htmlEntities:!1,entityDecoder:null,ignoreDeclaration:!1,ignorePiTags:!1,transformTagName:!1,transformAttributeName:!1,updateTag:function(J,Q,W){return J},captureMetaData:!1,maxNestedTags:100,strictReservedNames:!0,jPath:!0,onDangerousProperty:z7};function kQ(J,Q){if(typeof J!=="string")return;let W=J.toLowerCase();if(h5.some((Y)=>W===Y.toLowerCase()))throw Error(`[SECURITY] Invalid ${Q}: "${J}" is a reserved JavaScript keyword that could cause prototype pollution`);if(T6.some((Y)=>W===Y.toLowerCase()))throw Error(`[SECURITY] Invalid ${Q}: "${J}" is a reserved JavaScript keyword that could cause prototype pollution`)}function Z7(J,Q){if(typeof J==="boolean")return{enabled:J,maxEntitySize:1e4,maxExpansionDepth:1e4,maxTotalExpansions:1/0,maxExpandedLength:1e5,maxEntityCount:1000,allowedTags:null,tagFilter:null,appliesTo:"all"};if(typeof J==="object"&&J!==null)return{enabled:J.enabled!==!1,maxEntitySize:Math.max(1,J.maxEntitySize??1e4),maxExpansionDepth:Math.max(1,J.maxExpansionDepth??1e4),maxTotalExpansions:Math.max(1,J.maxTotalExpansions??1/0),maxExpandedLength:Math.max(1,J.maxExpandedLength??1e5),maxEntityCount:Math.max(1,J.maxEntityCount??1000),allowedTags:J.allowedTags??null,tagFilter:J.tagFilter??null,appliesTo:J.appliesTo??"all"};return Z7(!0)}var K7=function(J){let Q=Object.assign({},DQ,J),W=[{value:Q.attributeNamePrefix,name:"attributeNamePrefix"},{value:Q.attributesGroupName,name:"attributesGroupName"},{value:Q.textNodeName,name:"textNodeName"},{value:Q.cdataPropName,name:"cdataPropName"},{value:Q.commentPropName,name:"commentPropName"}];for(let{value:Y,name:U}of W)if(Y)kQ(Y,U);if(Q.onDangerousProperty===null)Q.onDangerousProperty=z7;if(Q.processEntities=Z7(Q.processEntities,Q.htmlEntities),Q.unpairedTagsSet=new Set(Q.unpairedTags),Q.stopNodes&&Array.isArray(Q.stopNodes))Q.stopNodes=Q.stopNodes.map((Y)=>{if(typeof Y==="string"&&Y.startsWith("*."))return"."+"."+Y.substring(2);return Y});return Q};var D6;if(typeof Symbol!=="function")D6="@@xmlMetadata";else D6=Symbol("XML Node Metadata");class qJ{constructor(J){this.tagname=J,this.child=[],this[":@"]=Object.create(null)}add(J,Q){if(J==="__proto__")J="#__proto__";this.child.push({[J]:Q})}addChild(J,Q){if(J.tagname==="__proto__")J.tagname="#__proto__";if(J[":@"]&&Object.keys(J[":@"]).length>0)this.child.push({[J.tagname]:J.child,[":@"]:J[":@"]});else this.child.push({[J.tagname]:J.child});if(Q!==void 0)this.child[this.child.length-1][D6]={startIndex:Q}}static getMetaDataSymbol(){return D6}}var X7=":A-Za-z_"+"\xC0-\xD6\xD8-\xF6\xF8-\u02FF"+"\u0370-\u037D"+"\u037F-\u0486\u0488-\u1FFF"+"\u200C-\u200D"+"\u2070-\u218F"+"\u2C00-\u2FEF"+"\u3001-\uD7FF"+"\uF900-\uFDCF"+"\uFDF0-\uFFFD",SQ=X7+"\\-\\.\\d"+"\xB7"+"\u0300-\u036F"+"\u203F-\u2040",$7=":A-Za-z_"+"\xC0-\u02FF"+"\u0370-\u037D"+"\u037F-\u0486\u0488-\u1FFF"+"\u200C-\u200D"+"\u2070-\u218F"+"\u2C00-\u2FEF"+"\u3001-\uD7FF"+"\uF900-\uFDCF"+"\uFDF0-\uFFFD"+"\uD800\uDC00-\uDB7F\uDFFF",IQ=$7+"\\-\\.\\d"+"\xB7"+"\u0300-\u036F"+"\u0487"+"\u203F-\u2040",M8=(J,Q,W="")=>{let Y=J.replace(":",""),U=Q.replace(":",""),G=`[${Y}][${U}]*`;return{name:new RegExp(`^[${J}][${Q}]*$`,W),ncName:new RegExp(`^${G}$`,W),qName:new RegExp(`^${G}(?::${G})?$`,W),nmToken:new RegExp(`^[${Q}]+$`,W),nmTokens:new RegExp(`^[${Q}]+(?:\\s+[${Q}]+)*$`,W)}},wQ=M8(X7,SQ),yQ=M8($7,IQ,"u");var bQ=":A-Za-z_\\-\\.\\d",_Q=M8(":A-Za-z_",bQ),H7=(J="1.0",Q=!1)=>{if(Q)return _Q;return J==="1.1"?yQ:wQ};var P8=(J,{xmlVersion:Q="1.0",asciiOnly:W=!1}={})=>H7(Q,W).qName.test(J);var F7=["name","ncName","qName","nmToken","nmTokens"],k6=(J,{xmlVersion:Q="1.0",asciiOnly:W=!1,maxCacheSize:Y=2048}={})=>{if(!F7.includes(J))throw TypeError(`Unknown production "${J}". Must be one of: ${F7.join(", ")}`);let U=H7(Q,W)[J],G=new Map,Z=(K)=>{let $=G.get(K);if($!==void 0)return $;let z=U.test(K);if(G.size<Y)G.set(K,z);return z};return Z.reset=()=>{G=new Map},Z};class S6{constructor(J,Q){this.suppressValidationErr=!J,this.options=J,this.xmlVersion=Q||1}setXmlVersion(J=1){this.xmlVersion=J}readDocType(J,Q){let W=Object.create(null),Y=0;if(J[Q+3]==="O"&&J[Q+4]==="C"&&J[Q+5]==="T"&&J[Q+6]==="Y"&&J[Q+7]==="P"&&J[Q+8]==="E"){Q=Q+9;let U=1,G=!1,Z=!1,K="";for(;Q<J.length;Q++)if(J[Q]==="<"&&!Z){if(G&&J5(J,"!ENTITY",Q)){Q+=7;let $,z;if([$,z,Q]=this.readEntityExp(J,Q+1,this.suppressValidationErr),z.indexOf("&")===-1){if(this.options.enabled!==!1&&this.options.maxEntityCount!=null&&Y>=this.options.maxEntityCount)throw Error(`Entity count (${Y+1}) exceeds maximum allowed (${this.options.maxEntityCount})`);W[$]=z,Y++}}else if(G&&J5(J,"!ELEMENT",Q)){Q+=8;let{index:$}=this.readElementExp(J,Q+1);Q=$}else if(G&&J5(J,"!ATTLIST",Q))Q+=8;else if(G&&J5(J,"!NOTATION",Q)){Q+=9;let{index:$}=this.readNotationExp(J,Q+1,this.suppressValidationErr);Q=$}else if(J5(J,"!--",Q))Z=!0;else throw Error("Invalid DOCTYPE");U++,K=""}else if(J[Q]===">"){if(Z){if(J[Q-1]==="-"&&J[Q-2]==="-")Z=!1,U--}else U--;if(U===0)break}else if(J[Q]==="[")G=!0;else K+=J[Q];if(U!==0)throw Error("Unclosed DOCTYPE")}else throw Error("Invalid Tag instead of DOCTYPE");return{entities:W,i:Q}}readEntityExp(J,Q){Q=XJ(J,Q);let W=Q;while(Q<J.length&&!/\s/.test(J[Q])&&J[Q]!=='"'&&J[Q]!=="'")Q++;let Y=J.substring(W,Q);if(p5(Y,{xmlVersion:this.xmlVersion}),Q=XJ(J,Q),!this.suppressValidationErr){if(J.substring(Q,Q+6).toUpperCase()==="SYSTEM")throw Error("External entities are not supported");else if(J[Q]==="%")throw Error("Parameter entities are not supported")}let U="";if([Q,U]=this.readIdentifierVal(J,Q,"entity"),this.options.enabled!==!1&&this.options.maxEntitySize!=null&&U.length>this.options.maxEntitySize)throw Error(`Entity "${Y}" size (${U.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`);return Q--,[Y,U,Q]}readNotationExp(J,Q){Q=XJ(J,Q);let W=Q;while(Q<J.length&&!/\s/.test(J[Q]))Q++;let Y=J.substring(W,Q);!this.suppressValidationErr&&p5(Y,{xmlVersion:this.xmlVersion}),Q=XJ(J,Q);let U=J.substring(Q,Q+6).toUpperCase();if(!this.suppressValidationErr&&U!=="SYSTEM"&&U!=="PUBLIC")throw Error(`Expected SYSTEM or PUBLIC, found "${U}"`);Q+=U.length,Q=XJ(J,Q);let G=null,Z=null;if(U==="PUBLIC"){if([Q,G]=this.readIdentifierVal(J,Q,"publicIdentifier"),Q=XJ(J,Q),J[Q]==='"'||J[Q]==="'")[Q,Z]=this.readIdentifierVal(J,Q,"systemIdentifier")}else if(U==="SYSTEM"){if([Q,Z]=this.readIdentifierVal(J,Q,"systemIdentifier"),!this.suppressValidationErr&&!Z)throw Error("Missing mandatory system identifier for SYSTEM notation")}return{notationName:Y,publicIdentifier:G,systemIdentifier:Z,index:--Q}}readIdentifierVal(J,Q,W){let Y="",U=J[Q];if(U!=='"'&&U!=="'")throw Error(`Expected quoted string, found "${U}"`);Q++;let G=Q;while(Q<J.length&&J[Q]!==U)Q++;if(Y=J.substring(G,Q),J[Q]!==U)throw Error(`Unterminated ${W} value`);return Q++,[Q,Y]}readElementExp(J,Q){Q=XJ(J,Q);let W=Q;while(Q<J.length&&!/\s/.test(J[Q]))Q++;let Y=J.substring(W,Q);if(!this.suppressValidationErr&&!P8(Y,{xmlVersion:this.xmlVersion}))throw Error(`Invalid element name: "${Y}"`);Q=XJ(J,Q);let U="";if(J[Q]==="E"&&J5(J,"MPTY",Q))Q+=4;else if(J[Q]==="A"&&J5(J,"NY",Q))Q+=2;else if(J[Q]==="("){Q++;let G=Q;while(Q<J.length&&J[Q]!==")")Q++;if(U=J.substring(G,Q),J[Q]!==")")throw Error("Unterminated content model")}else if(!this.suppressValidationErr)throw Error(`Invalid Element Expression, found "${J[Q]}"`);return{elementName:Y,contentModel:U.trim(),index:Q}}readAttlistExp(J,Q){Q=XJ(J,Q);let W=Q;while(Q<J.length&&!/\s/.test(J[Q]))Q++;let Y=J.substring(W,Q);p5(Y,{xmlVersion:this.xmlVersion}),Q=XJ(J,Q),W=Q;while(Q<J.length&&!/\s/.test(J[Q]))Q++;let U=J.substring(W,Q);if(!p5(U,{xmlVersion:this.xmlVersion}))throw Error(`Invalid attribute name: "${U}"`);Q=XJ(J,Q);let G="";if(J.substring(Q,Q+8).toUpperCase()==="NOTATION"){if(G="NOTATION",Q+=8,Q=XJ(J,Q),J[Q]!=="(")throw Error(`Expected '(', found "${J[Q]}"`);Q++;let K=[];while(Q<J.length&&J[Q]!==")"){let $=Q;while(Q<J.length&&J[Q]!=="|"&&J[Q]!==")")Q++;let z=J.substring($,Q);if(z=z.trim(),!p5(z,{xmlVersion:this.xmlVersion}))throw Error(`Invalid notation name: "${z}"`);if(K.push(z),J[Q]==="|")Q++,Q=XJ(J,Q)}if(J[Q]!==")")throw Error("Unterminated list of notations");Q++,G+=" ("+K.join("|")+")"}else{let K=Q;while(Q<J.length&&!/\s/.test(J[Q]))Q++;G+=J.substring(K,Q);let $=["CDATA","ID","IDREF","IDREFS","ENTITY","ENTITIES","NMTOKEN","NMTOKENS"];if(!this.suppressValidationErr&&!$.includes(G.toUpperCase()))throw Error(`Invalid attribute type: "${G}"`)}Q=XJ(J,Q);let Z="";if(J.substring(Q,Q+8).toUpperCase()==="#REQUIRED")Z="#REQUIRED",Q+=8;else if(J.substring(Q,Q+7).toUpperCase()==="#IMPLIED")Z="#IMPLIED",Q+=7;else[Q,Z]=this.readIdentifierVal(J,Q,"ATTLIST");return{elementName:Y,attributeName:U,attributeType:G,defaultValue:Z,index:Q}}}var XJ=(J,Q)=>{while(Q<J.length&&/\s/.test(J[Q]))Q++;return Q};function J5(J,Q,W){for(let Y=0;Y<Q.length;Y++)if(Q[Y]!==J[W+Y+1])return!1;return!0}function p5(J,Q){if(P8(J,{xmlVersion:Q}))return J;else throw Error(`Invalid entity name ${J}`)}var fQ=[48,1632,1776,2406,2534,2662,2790,2918,3046,3174,3302,3430,3558,3664,3792,3872,4160,4240,6112,6160,6470,6608,6784,6800,6992,7088,7232,7248,65296,120782,120792,120802,120812,120822,66720,68912,69734,69872,69942,70096,70384,70736,70864,71248,71360,71472,71904,72016,72688,72784,73040,73120,73552,92768,92864,93008,123200,123632,124144,125264,130032],O8=255,I6=new Map;var d5=1632;var w6=new Uint8Array(63904).fill(255);for(let J of fQ)for(let Q=0;Q<10;Q++){let W=J+Q;if(W<=65535)w6[W-1632]=Q;else I6.set(W,Q)}var V7=48,q7=57,L7=45,y6=new Set([8722,65293,65123]);function vQ(J){if(typeof J!=="string")return J;let Q=J.length;if(Q===0)return J;let W=-1;for(let U=0;U<Q;U++){let G=J.charCodeAt(U);if(G>=V7&&G<=q7||G===L7)continue;if(G<d5){if(y6.has(G)){W=U;break}continue}if(G>=55296&&G<=56319){if(U+1<Q){let Z=J.charCodeAt(U+1);if(Z>=56320&&Z<=57343){let K=65536+(G-55296<<10)+(Z-56320);if(I6.has(K)){W=U;break}}}continue}if(w6[G-d5]!==O8||y6.has(G)){W=U;break}}if(W===-1)return J;let Y=[];if(W>0)Y.push(J.slice(0,W));for(let U=W;U<Q;U++){let G=J.charCodeAt(U);if(G>=V7&&G<=q7||G===L7){Y.push(J[U]);continue}if(G<d5){Y.push(y6.has(G)?"-":J[U]);continue}if(G>=55296&&G<=56319){if(U+1<Q){let K=J.charCodeAt(U+1);if(K>=56320&&K<=57343){let $=65536+(G-55296<<10)+(K-56320),z=I6.get($);if(z!==void 0){Y.push(String.fromCharCode(z+48)),U++;continue}}}Y.push(J[U]);continue}if(y6.has(G)){Y.push("-");continue}let Z=w6[G-d5];Y.push(Z!==O8?String.fromCharCode(Z+48):J[U])}return Y.join("")}var B7=vQ;var xQ=/^[-+]?0x[a-fA-F0-9]+$/,hQ=/^0b[01]+$/,uQ=/^0o[0-7]+$/,gQ=/^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/,mQ={hex:!0,binary:!1,octal:!1,leadingZeros:!0,decimalPoint:".",eNotation:!0,infinity:"original",unicode:!1};function R8(J,Q={}){if(Q=Object.assign({},mQ,Q),!J||typeof J!=="string")return J;let W=J.trim();if(W.length===0)return J;else if(Q.skipLike!==void 0&&Q.skipLike.test(W))return J;else if(W==="0")return 0;if(Q.unicode){if(W=B7(W),W==="0")return 0}if(Q.hex&&xQ.test(W))return C8(W,16);else if(Q.binary&&hQ.test(W))return C8(W,2);else if(Q.octal&&uQ.test(W))return C8(W,8);else if(!isFinite(W))return lQ(J,Number(W),Q);else if(W.includes("e")||W.includes("E"))return pQ(J,W,Q);else{let Y=gQ.exec(W);if(Y){let U=Y[1]||"",G=Y[2],Z=dQ(Y[3]),K=U?J[G.length+1]===".":J[G.length]===".";if(!Q.leadingZeros&&(G.length>1||G.length===1&&!K))return J;else{let $=Number(W),z=String($);if($===0)return $;if(z.search(/[eE]/)!==-1)if(Q.eNotation)return $;else return J;else if(W.indexOf(".")!==-1)if(z==="0")return $;else if(z===Z)return $;else if(z===`${U}${Z}`)return $;else return J;let F=G?Z:W;if(G)return F===z||U+F===z?$:J;else return F===z||F===U+z?$:J}}else return J}}var cQ=/^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;function pQ(J,Q,W){if(!W.eNotation)return J;let Y=Q.match(cQ);if(Y){let U=Y[1]||"",G=Y[3].indexOf("e")===-1?"E":"e",Z=Y[2],K=U?J[Z.length+1]===G:J[Z.length]===G;if(Z.length>1&&K)return J;else if(Z.length===1&&(Y[3].startsWith(`.${G}`)||Y[3][0]===G))return Number(Q);else if(Z.length>0)if(W.leadingZeros&&!K)return Q=(Y[1]||"")+Y[3],Number(Q);else return J;else return Number(Q)}else return J}function dQ(J){if(J&&J.indexOf(".")!==-1){if(J=J.replace(/0+$/,""),J===".")J="0";else if(J[0]===".")J="0"+J;else if(J[J.length-1]===".")J=J.substring(0,J.length-1);return J}return J}function C8(J,Q){let W=J.trim();if(Q===2||Q===8)J=W.substring(2);if(parseInt)return parseInt(J,Q);else if(Number.parseInt)return Number.parseInt(J,Q);else if(window&&window.parseInt)return window.parseInt(J,Q);else throw Error("parseInt, Number.parseInt, window.parseInt are not supported")}function lQ(J,Q,W){let Y=Q===1/0;switch(W.infinity.toLowerCase()){case"null":return null;case"infinity":return Q;case"string":return Y?"Infinity":"-Infinity";case"original":default:return J}}function A8(J){if(typeof J==="function")return J;if(Array.isArray(J))return(Q)=>{for(let W of J){if(typeof W==="string"&&Q===W)return!0;if(W instanceof RegExp&&W.test(Q))return!0}};return()=>!1}class PJ{constructor(J,Q={},W){this.pattern=J,this.separator=Q.separator||".",this.segments=this._parse(J),this.data=W,this._hasDeepWildcard=this.segments.some((Y)=>Y.type==="deep-wildcard"),this._hasAttributeCondition=this.segments.some((Y)=>Y.attrName!==void 0),this._hasPositionSelector=this.segments.some((Y)=>Y.position!==void 0)}_parse(J){let Q=[],W=0,Y="";while(W<J.length)if(J[W]===this.separator)if(W+1<J.length&&J[W+1]===this.separator){if(Y.trim())Q.push(this._parseSegment(Y.trim())),Y="";Q.push({type:"deep-wildcard"}),W+=2}else{if(Y.trim())Q.push(this._parseSegment(Y.trim()));Y="",W++}else Y+=J[W],W++;if(Y.trim())Q.push(this._parseSegment(Y.trim()));return Q}_parseSegment(J){let Q={type:"tag"},W=null,Y=J,U=J.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);if(U){if(Y=U[1]+U[3],U[2]){let z=U[2].slice(1,-1);if(z)W=z}}let G=void 0,Z=Y;if(Y.includes("::")){let z=Y.indexOf("::");if(G=Y.substring(0,z).trim(),Z=Y.substring(z+2).trim(),!G)throw Error(`Invalid namespace in pattern: ${J}`)}let K=void 0,$=null;if(Z.includes(":")){let z=Z.lastIndexOf(":"),F=Z.substring(0,z).trim(),X=Z.substring(z+1).trim();if(["first","last","odd","even"].includes(X)||/^nth\(\d+\)$/.test(X))K=F,$=X;else K=Z}else K=Z;if(!K)throw Error(`Invalid segment pattern: ${J}`);if(Q.tag=K,G)Q.namespace=G;if(W)if(W.includes("=")){let z=W.indexOf("=");Q.attrName=W.substring(0,z).trim(),Q.attrValue=W.substring(z+1).trim()}else Q.attrName=W.trim();if($){let z=$.match(/^nth\((\d+)\)$/);if(z)Q.position="nth",Q.positionValue=parseInt(z[1],10);else Q.position=$}return Q}get length(){return this.segments.length}hasDeepWildcard(){return this._hasDeepWildcard}hasAttributeCondition(){return this._hasAttributeCondition}hasPositionSelector(){return this._hasPositionSelector}toString(){return this.pattern}}class l5{constructor(){this._byDepthAndTag=new Map,this._wildcardByDepth=new Map,this._deepWildcards=[],this._deepByTerminalTag=new Map,this._patterns=new Set,this._sealed=!1}add(J){if(this._sealed)throw TypeError("ExpressionSet is sealed. Create a new ExpressionSet to add more expressions.");if(this._patterns.has(J.pattern))return this;if(this._patterns.add(J.pattern),J.hasDeepWildcard()){let U=J.segments[J.segments.length-1];if(U&&U.type!=="deep-wildcard"&&U.tag!=="*"){let G=U.tag;if(!this._deepByTerminalTag.has(G))this._deepByTerminalTag.set(G,[]);this._deepByTerminalTag.get(G).push(J)}else this._deepWildcards.push(J);return this}let Q=J.length,Y=J.segments[J.segments.length-1]?.tag;if(!Y||Y==="*"){if(!this._wildcardByDepth.has(Q))this._wildcardByDepth.set(Q,[]);this._wildcardByDepth.get(Q).push(J)}else{let U=`${Q}:${Y}`;if(!this._byDepthAndTag.has(U))this._byDepthAndTag.set(U,[]);this._byDepthAndTag.get(U).push(J)}return this}addAll(J){for(let Q of J)this.add(Q);return this}has(J){return this._patterns.has(J.pattern)}get size(){return this._patterns.size}seal(){return this._sealed=!0,this}get isSealed(){return this._sealed}matchesAny(J){return this.findMatch(J)!==null}findMatch(J){let Q=J.getDepth(),W=J.getCurrentTag(),Y=`${Q}:${W}`,U=this._byDepthAndTag.get(Y);if(U){for(let K=0;K<U.length;K++)if(J.matches(U[K]))return U[K]}let G=this._wildcardByDepth.get(Q);if(G){for(let K=0;K<G.length;K++)if(J.matches(G[K]))return G[K]}let Z=this._deepByTerminalTag.get(W);if(Z){for(let K=0;K<Z.length;K++)if(J.matches(Z[K]))return Z[K]}for(let K=0;K<this._deepWildcards.length;K++)if(J.matches(this._deepWildcards[K]))return this._deepWildcards[K];return null}}class j7{constructor(J){this._matcher=J}get separator(){return this._matcher.separator}getCurrentTag(){let J=this._matcher.path;return J.length>0?J[J.length-1].tag:void 0}getCurrentNamespace(){let J=this._matcher.path;return J.length>0?J[J.length-1].namespace:void 0}getAttrValue(J){let Q=this._matcher.path;if(Q.length===0)return;return Q[Q.length-1].values?.[J]}hasAttr(J){let Q=this._matcher.path;if(Q.length===0)return!1;let W=Q[Q.length-1];return W.values!==void 0&&J in W.values}getAnyParentAttr(J){return this._matcher.getAnyParentAttr(J)}hasAnyParentAttr(J){return this._matcher.hasAnyParentAttr(J)}getPosition(){let J=this._matcher.path;if(J.length===0)return-1;return J[J.length-1].position??0}getCounter(){let J=this._matcher.path;if(J.length===0)return-1;return J[J.length-1].counter??0}getIndex(){return this.getPosition()}getDepth(){return this._matcher.path.length}toString(J,Q=!0){return this._matcher.toString(J,Q)}toArray(){return this._matcher.path.map((J)=>J.tag)}matches(J){return this._matcher.matches(J)}matchesAny(J){return J.matchesAny(this._matcher)}}class bJ{constructor(J={}){this.separator=J.separator||".",this.path=[],this.siblingStacks=[],this._pathStringCache=null,this._view=new j7(this),this._keptAttrs=[]}push(J,Q=null,W=null,Y=null){if(this._pathStringCache=null,this.path.length>0)this.path[this.path.length-1].values=void 0;let U=this.path.length,G=this.siblingStacks[U];if(!G)G={counts:new Map,total:0},this.siblingStacks[U]=G;let Z=W?`${W}:${J}`:J,K=G.counts.get(Z)||0,$=G.total;G.counts.set(Z,K+1),G.total++;let z={tag:J,position:$,counter:K};if(W!==null&&W!==void 0)z.namespace=W;if(Q!==null&&Q!==void 0)z.values=Q;this.path.push(z);let F=this.path.length,X=Y!==null?Y.keep:null;if(X!==null&&X!==void 0&&X.length>0&&Q)for(let H=0;H<X.length;H++){let V=X[H];if(Q[V]!==void 0)this._keptAttrs.push({depth:F,name:V,value:Q[V]})}}pop(){if(this.path.length===0)return;this._pathStringCache=null;let J=this.path.pop();if(this.siblingStacks.length>this.path.length+1)this.siblingStacks.length=this.path.length+1;let Q=this.path.length+1;while(this._keptAttrs.length>0&&this._keptAttrs[this._keptAttrs.length-1].depth>=Q)this._keptAttrs.pop();return J}updateCurrent(J){if(this.path.length>0){let Q=this.path[this.path.length-1];if(J!==null&&J!==void 0)Q.values=J}}getCurrentTag(){return this.path.length>0?this.path[this.path.length-1].tag:void 0}getCurrentNamespace(){return this.path.length>0?this.path[this.path.length-1].namespace:void 0}getAttrValue(J){if(this.path.length===0)return;return this.path[this.path.length-1].values?.[J]}hasAttr(J){if(this.path.length===0)return!1;let Q=this.path[this.path.length-1];return Q.values!==void 0&&J in Q.values}getAnyParentAttr(J){let Q=this._keptAttrs;for(let W=Q.length-1;W>=0;W--)if(Q[W].name===J)return Q[W].value;return}hasAnyParentAttr(J){let Q=this._keptAttrs;for(let W=Q.length-1;W>=0;W--)if(Q[W].name===J)return!0;return!1}getPosition(){if(this.path.length===0)return-1;return this.path[this.path.length-1].position??0}getCounter(){if(this.path.length===0)return-1;return this.path[this.path.length-1].counter??0}getIndex(){return this.getPosition()}getDepth(){return this.path.length}toString(J,Q=!0){let W=J||this.separator;if(W===this.separator&&Q===!0){if(this._pathStringCache!==null)return this._pathStringCache;let U=this.path.map((G)=>G.namespace?`${G.namespace}:${G.tag}`:G.tag).join(W);return this._pathStringCache=U,U}return this.path.map((U)=>Q&&U.namespace?`${U.namespace}:${U.tag}`:U.tag).join(W)}toArray(){return this.path.map((J)=>J.tag)}reset(){this._pathStringCache=null,this.path=[],this.siblingStacks=[],this._keptAttrs=[]}matches(J){let Q=J.segments;if(Q.length===0)return!1;if(J.hasDeepWildcard())return this._matchWithDeepWildcard(Q);return this._matchSimple(Q)}_matchSimple(J){if(this.path.length!==J.length)return!1;for(let Q=0;Q<J.length;Q++)if(!this._matchSegment(J[Q],this.path[Q],Q===this.path.length-1))return!1;return!0}_matchWithDeepWildcard(J){let Q=this.path.length-1,W=J.length-1;while(W>=0&&Q>=0){let Y=J[W];if(Y.type==="deep-wildcard"){if(W--,W<0)return!0;let U=J[W],G=!1;for(let Z=Q;Z>=0;Z--)if(this._matchSegment(U,this.path[Z],Z===this.path.length-1)){Q=Z-1,W--,G=!0;break}if(!G)return!1}else{if(!this._matchSegment(Y,this.path[Q],Q===this.path.length-1))return!1;Q--,W--}}return W<0}_matchSegment(J,Q,W){if(J.tag!=="*"&&J.tag!==Q.tag)return!1;if(J.namespace!==void 0){if(J.namespace!=="*"&&J.namespace!==Q.namespace)return!1}if(J.attrName!==void 0){if(!W)return!1;if(!Q.values||!(J.attrName in Q.values))return!1;if(J.attrValue!==void 0){if(String(Q.values[J.attrName])!==String(J.attrValue))return!1}}if(J.position!==void 0){if(!W)return!1;let Y=Q.counter??0;if(J.position==="first"&&Y!==0)return!1;else if(J.position==="odd"&&Y%2!==1)return!1;else if(J.position==="even"&&Y%2!==0)return!1;else if(J.position==="nth"&&Y!==J.positionValue)return!1}return!0}matchesAny(J){return J.matchesAny(this)}snapshot(){return{path:this.path.map((J)=>({...J})),siblingStacks:this.siblingStacks.map((J)=>J?{counts:new Map(J.counts),total:J.total}:J),keptAttrs:this._keptAttrs.map((J)=>({...J}))}}restore(J){this._pathStringCache=null,this.path=J.path.map((Q)=>({...Q})),this.siblingStacks=J.siblingStacks.map((Q)=>Q?{counts:new Map(Q.counts),total:Q.total}:Q),this._keptAttrs=(J.keptAttrs||[]).map((Q)=>({...Q}))}readOnly(){return this._view}}var nQ=[{id:"html-script-open",description:"<script opening tag",pattern:/<script[\s>/]/i},{id:"html-script-close",description:"</script closing tag",pattern:/<\/script[\s>]/i},{id:"html-javascript-protocol",description:"javascript: URI scheme (with optional whitespace/encoding)",pattern:/j[\t\n\r ]*a[\t\n\r ]*v[\t\n\r ]*a[\t\n\r ]*s[\t\n\r ]*c[\t\n\r ]*r[\t\n\r ]*i[\t\n\r ]*p[\t\n\r ]*t[\t\n\r ]*:/i},{id:"html-vbscript-protocol",description:"vbscript: URI scheme",pattern:/vbscript[\t\n\r ]*:/i},{id:"html-data-html",description:"data:text/html URI \u2014 can execute scripts in browsers",pattern:/data[\t\n\r ]*:[\t\n\r ]*text\/html/i},{id:"html-data-xhtml",description:"data:application/xhtml+xml URI",pattern:/data[\t\n\r ]*:[\t\n\r ]*application\/xhtml/i},{id:"html-data-svg",description:"data:image/svg+xml URI \u2014 can execute scripts",pattern:/data[\t\n\r ]*:[\t\n\r ]*image\/svg\+xml/i},{id:"html-inline-event-handler",description:"Inline event handler attributes: onclick=, onerror=, onload=, etc.",pattern:/\bon\w{1,30}\s*=/i},{id:"html-entity-obfuscated-script",description:"HTML-entity-encoded <script (e.g. &#x3C;script or &lt;script)",pattern:/(?:&#x0*3[Cc];?|&#0*60;?|&lt;)\s*script/i},{id:"html-entity-obfuscated-javascript",description:'HTML-entity-encoded javascript: (partial \u2014 catches common &#106; or &#x6a; for "j")',pattern:/(?:&#x0*6[Aa];?|&#0*106;?)\s*(?:&#x0*61;?|a)[\s\S]{0,80}script\s*:/i},{id:"html-style-expression",description:"CSS expression() \u2014 IE-era code execution in style attributes",pattern:/style[\s\S]{0,20}expression\s*\(/i},{id:"html-object-embed",description:"<object or <embed tags that can load active content",pattern:/<(?:object|embed)[\s>/]/i},{id:"html-base-tag",description:"<base href= \u2014 can hijack all relative URLs on a page",pattern:/<base[\s>]/i},{id:"html-meta-refresh",description:'<meta http-equiv="refresh" \u2014 can redirect users',pattern:/<meta[\s\S]{0,40}http-equiv[\s\S]{0,20}refresh/i},{id:"html-srcdoc",description:"srcdoc= attribute on iframes \u2014 embeds HTML that can run scripts",pattern:/srcdoc\s*=/i},{id:"html-iframe",description:"<iframe tag",pattern:/<iframe[\s>/]/i},{id:"html-form",description:"<form tag \u2014 can be used for phishing / credential harvesting injection",pattern:/<form[\s>/]/i}],M5=nQ;var iQ=[{id:"xml-cdata-injection",description:"CDATA section injection: <![CDATA[ breaks out of text node context",pattern:/<!\[CDATA\[/i},{id:"xml-cdata-close",description:"CDATA close sequence: ]]> can terminate an enclosing CDATA section",pattern:/\]\]>/},{id:"xml-processing-instruction",description:"XML processing instruction: <?xml-stylesheet or <?php etc.",pattern:/<\?(?:xml[\- ]|php|asp)/i},{id:"xml-doctype-injection",description:"DOCTYPE declaration embedded in content \u2014 can define entities",pattern:/<!DOCTYPE(?:[\s[]|$)/i},{id:"xml-entity-system",description:"SYSTEM keyword \u2014 used in external entity declarations (XXE)",pattern:/\bSYSTEM\s+["']/i},{id:"xml-entity-public",description:"PUBLIC keyword \u2014 used in external entity declarations (XXE)",pattern:/\bPUBLIC\s+["']/i},{id:"xml-entity-declaration",description:"<!ENTITY declaration \u2014 defines entities, potential XXE or entity expansion",pattern:/<!ENTITY[\s%]/i},{id:"xml-billion-laughs",description:"Entity reference chaining / billion laughs: repeated &eX; style references",pattern:/(?:&\w{1,20};){3,}/},{id:"xml-namespace-confusion",description:"xmlns: attribute injection \u2014 can redefine namespaces to confuse parsers",pattern:/\bxmlns\s*(?::\w{1,40})?\s*=/i},{id:"xml-comment-injection",description:"<!-- comment injection \u2014 can hide content from some parsers",pattern:/<!--/},{id:"xml-comment-close",description:"--> closes an enclosing XML comment",pattern:/-->/},{id:"xml-pi-close",description:"?> closes an enclosing processing instruction",pattern:/\?>/}],P5=iQ;var oQ=[{id:"svg-script-element",description:"<script element inside SVG executes JavaScript",pattern:/<script[\s>/]/i},{id:"svg-xlink-href-javascript",description:"xlink:href with javascript: \u2014 classic SVG XSS via <a> or <use>",pattern:/xlink\s*:\s*href\s*=\s*["']?\s*javascript\s*:/i},{id:"svg-href-javascript",description:"href= with javascript: in SVG context (<a>, <animate>, etc.)",pattern:/href\s*=\s*["']?\s*javascript\s*:/i},{id:"svg-foreignobject",description:"<foreignObject embeds HTML inside SVG \u2014 can execute scripts",pattern:/<foreignObject[\s>/]/i},{id:"svg-use-external",description:"<use xlink:href or href pointing to external resource (non-fragment URL)",pattern:/<use[\s\S]{0,60}(?:xlink\s*:\s*)?href\s*=\s*(?:["'][^#]|[^"'#\s>])/i},{id:"svg-animate-href",description:'<animate attributeName="href" \u2014 can dynamically change href to javascript:',pattern:/<animate[\s\S]{0,80}attributeName\s*=\s*["'][\s]*href["']/i},{id:"svg-animate-xlinkhref",description:'<animate attributeName="xlink:href"',pattern:/<animate[\s\S]{0,80}attributeName\s*=\s*["'][\s]*xlink\s*:\s*href["']/i},{id:"svg-set-javascript",description:'<set to="javascript:..." \u2014 sets an attribute to a javascript: URI',pattern:/<set[\s\S]{0,80}to\s*=\s*["']?\s*javascript\s*:/i},{id:"svg-event-handler",description:"SVG-specific event handler attributes: onload=, onerror=, onactivate=, etc.",pattern:/\bon(?:load|error|activate|begin|end|repeat|focus|blur|click|mouse\w{1,20}|key\w{1,20})\s*=/i},{id:"svg-handler-generic",description:"Generic on* handler catch-all for SVG attributes",pattern:/\bon\w{1,30}\s*=/i},{id:"svg-filter-feimage",description:"<feImage href= \u2014 filter primitive that can load external resources",pattern:/<feImage[\s\S]{0,80}(?:xlink\s*:\s*)?href\s*=/i},{id:"svg-image-external",description:"<image xlink:href with http/https or javascript protocol",pattern:/<image[\s\S]{0,80}(?:xlink\s*:\s*)?href\s*=\s*["']?\s*(?:https?|javascript)\s*:/i},{id:"svg-style-javascript",description:"style= attribute containing javascript: (e.g. background:url(javascript:...))",pattern:/style\s*=[\s\S]{0,60}javascript\s*:/i}],T8=oQ;var rQ=[{id:"sql-block-comment-open",description:"SQL block comment open: /* ... */ \u2014 unusual in legitimate user text",pattern:/\/\*/},{id:"sql-union-select",description:"UNION SELECT \u2014 most common SQL injection aggregation attack",pattern:/\bUNION\s{1,20}(?:ALL\s{1,20})?SELECT\b/i},{id:"sql-drop-table",description:"DROP TABLE \u2014 destructive DDL injection",pattern:/\bDROP\s{1,20}TABLE\b/i},{id:"sql-drop-database",description:"DROP DATABASE \u2014 destructive DDL injection",pattern:/\bDROP\s{1,20}DATABASE\b/i},{id:"sql-insert-into",description:"INSERT INTO \u2014 data injection",pattern:/\bINSERT\s{1,20}INTO\b/i},{id:"sql-delete-from",description:"DELETE FROM \u2014 data deletion injection",pattern:/\bDELETE\s{1,20}FROM\b/i},{id:"sql-update-set",description:"UPDATE ... SET \u2014 data modification injection",pattern:/\bUPDATE\b[\s\S]{1,60}\bSET\b/i},{id:"sql-exec-xp",description:"EXEC xp_ \u2014 MSSQL extended stored procedure execution",pattern:/\bEXEC(?:UTE)?\s{1,20}xp_/i},{id:"sql-tautology-string",description:`Classic string tautology: ' OR '1'='1 or " OR "1"="1"`,pattern:/'\s{0,10}OR\s{0,10}'[^']{0,20}'\s*=\s*'[^']{0,20}/i},{id:"sql-tautology-numeric",description:"Numeric tautology: OR 1=1",pattern:/\bOR\s{1,10}1\s*=\s*1\b/i},{id:"sql-always-true-zero",description:"Numeric tautology: OR 0=0",pattern:/\bOR\s{1,10}0\s*=\s*0\b/i},{id:"sql-sleep-benchmark",description:"Time-based blind injection: SLEEP() or BENCHMARK()",pattern:/\b(?:SLEEP|BENCHMARK)\s*\(/i},{id:"sql-waitfor-delay",description:"MSSQL time-based blind injection: WAITFOR DELAY",pattern:/\bWAITFOR\s{1,20}DELAY\b/i},{id:"sql-char-function",description:"CHAR() function \u2014 used to obfuscate injected strings",pattern:/\bCHAR\s*\(\s*\d{1,3}/i},{id:"sql-information-schema",description:"INFORMATION_SCHEMA \u2014 reconnaissance query for table/column enumeration",pattern:/\bINFORMATION_SCHEMA\b/i}],n5=rQ;var aQ=[{id:"shell-path-traversal-unix",description:"Unix path traversal: parent slash  \u2014 climbing the directory tree",pattern:/\.\.\//},{id:"shell-path-traversal-windows",description:"Windows path traversal: parent backslash \u2014 climbing the directory tree",pattern:/\.\.\\/},{id:"shell-path-traversal-encoded",description:"URL-encoded path traversal: %2e%2e or %2f variants",pattern:/%2e%2e|%2f\.\.|\.\.%2f/i},{id:"shell-null-byte",description:"Null byte injection: \\x00 or %00 \u2014 truncates strings in C-backed functions",pattern:/\x00|%00/},{id:"shell-semicolon",description:"Semicolon command separator: cmd1; cmd2",pattern:/;/},{id:"shell-pipe",description:"Pipe operator: cmd1 | cmd2",pattern:/\|/},{id:"shell-and-operator",description:"AND operator: cmd1 && cmd2",pattern:/&&/},{id:"shell-or-operator",description:"OR operator: cmd1 || cmd2",pattern:/\|\|/},{id:"shell-backtick",description:"Backtick command substitution: `cmd`",pattern:/`/},{id:"shell-dollar-paren",description:"Dollar-paren command substitution: $(cmd)",pattern:/\$\(/},{id:"shell-dollar-brace",description:"Dollar-brace variable expansion: ${var} \u2014 can be abused for injection",pattern:/\$\{/},{id:"shell-redirect-out",description:"Output redirection: cmd > file or cmd >> file",pattern:/>{1,2}/},{id:"shell-redirect-in",description:"Input redirection: cmd < file",pattern:/</},{id:"shell-newline-injection",description:"Newline injection: \\n or \\r \u2014 can inject new shell commands",pattern:/[\n\r]/},{id:"shell-glob-star",description:"Glob expansion: * or ? \u2014 can expand to unintended files",pattern:/[/\\][*?]/},{id:"shell-absolute-root",description:"Absolute root path injection: string starting with / or \\ (Windows UNC)",pattern:/^(?:\/|\\\\)/},{id:"shell-windows-drive",description:"Windows drive letter path injection: C:\\ or D:/",pattern:/^[a-zA-Z]:[/\\]/},{id:"shell-curl-wget",description:"curl/wget with URL or flags \u2014 can exfiltrate data or download payloads",pattern:/\b(?:curl|wget)\s+(?:https?:\/\/|ftp:\/\/|-)/i}],E8=aQ;var sQ=[{id:"redos-nested-quantifier-plus",description:"Nested + quantifier inside a group with outer quantifier: (a+)+, (.+b)*, etc.",pattern:/\([^)]*\+[^)]*\)[+*]/},{id:"redos-nested-quantifier-star",description:"Nested * quantifier: (a*)* or (a*)+ \u2014 catastrophic backtracking",pattern:/\([^)]*\*[^)]*\)[*+]/},{id:"redos-nested-groups",description:"Doubly nested quantified groups: ((a+)+) \u2014 guaranteed catastrophic",pattern:/\(\([^)]{0,40}\)[+*]\)[+*]/},{id:"redos-alternation-overlap",description:"Overlapping alternation under quantifier: (a|a)+ \u2014 ambiguous NFA paths",pattern:/\(([^|()]{1,20})\|(?:\1)(?:\|[^|()]{1,20}){0,5}\)[+*?]{1,2}/},{id:"redos-star-plus-concat",description:"(x*x)+ pattern \u2014 triggers super-linear backtracking",pattern:/\([^)]{0,10}\*[^)]{0,10}\)[+*]/},{id:"redos-dot-star-greedy",description:"(.*){n,} or (.+){n,} \u2014 repeated greedy dot quantifiers",pattern:/\(\.[*+]\)\{?\d/},{id:"redos-large-repetition",description:"Very large fixed or range repetition count {1000,} or {1000,n} \u2014 denial of service via backtracking",pattern:/\{\d{4,}(?:,\d*)?\}/},{id:"redos-catastrophic-alternation",description:"Long alternation with many similar branches \u2014 polynomial backtracking risk",pattern:/\([^)]{0,200}(?:\|[^|)]{0,50}){9,}\)/}],N8=sQ;var tQ=[{id:"nosql-where-operator",description:"$where \u2014 executes arbitrary JavaScript server-side in MongoDB",pattern:new RegExp(`\\$where["'\\s]*:`,"i")},{id:"nosql-ne-operator",description:'$ne \u2014 "not equal" operator used to bypass equality checks',pattern:new RegExp(`\\$ne["'\\s]*:`,"i")},{id:"nosql-gt-operator",description:'$gt \u2014 "greater than" used to bypass password/value checks',pattern:new RegExp(`\\$gte?["'\\s]*:`,"i")},{id:"nosql-lt-operator",description:'$lt / $lte \u2014 "less than" bypass variants',pattern:new RegExp(`\\$lte?["'\\s]*:`,"i")},{id:"nosql-regex-operator",description:"$regex \u2014 can be used to extract data character by character (blind injection)",pattern:new RegExp(`\\$regex["'\\s]*:`,"i")},{id:"nosql-or-operator",description:"$or \u2014 logical OR; used to create always-true conditions",pattern:new RegExp(`\\$or["'\\s]*:\\s*\\[`,"i")},{id:"nosql-and-operator",description:"$and \u2014 logical AND operator injection",pattern:new RegExp(`\\$and["'\\s]*:\\s*\\[`,"i")},{id:"nosql-nor-operator",description:"$nor \u2014 logical NOR operator injection",pattern:new RegExp(`\\$nor["'\\s]*:\\s*\\[`,"i")},{id:"nosql-exists-operator",description:"$exists \u2014 can enumerate fields to determine schema",pattern:new RegExp(`\\$exists["'\\s]*:`,"i")},{id:"nosql-in-operator",description:"$in \u2014 matches any value in a list; can enumerate values",pattern:new RegExp(`\\$in["'\\s]*:\\s*\\[`,"i")},{id:"nosql-expr-operator",description:"$expr \u2014 allows aggregation expressions in queries (MongoDB 3.6+)",pattern:new RegExp(`\\$expr["'\\s]*:`,"i")},{id:"nosql-function-operator",description:"$function \u2014 executes arbitrary JavaScript in MongoDB 4.4+",pattern:new RegExp(`\\$function["'\\s]*:`,"i")},{id:"nosql-accumulator-operator",description:"$accumulator \u2014 custom aggregation with arbitrary JS execution",pattern:new RegExp(`\\$accumulator["'\\s]*:`,"i")},{id:"nosql-proto-pollution",description:"__proto__ \u2014 prototype pollution via object key injection",pattern:/__proto__/},{id:"nosql-constructor-prototype",description:"constructor.prototype \u2014 alternative prototype pollution vector (dot notation or JSON key)",pattern:/constructor[\s"':.,{\[]*prototype/i},{id:"nosql-proto-bracket",description:'["__proto__"] \u2014 bracket-notation prototype pollution',pattern:/\[["']__proto__["']\]/}],D8=tQ;var eQ=[{id:"log-crlf-injection",description:"CRLF injection: literal \\r or \\n embeds fake log lines",pattern:/[\r\n]/},{id:"log-url-encoded-crlf",description:"URL-encoded CRLF: %0d, %0a, %0D, %0A \u2014 decoded by some log parsers",pattern:/%0[dDaA]/},{id:"log-unicode-newline",description:"Unicode newline variants: U+2028 (line separator), U+2029 (paragraph separator)",pattern:/[\u2028\u2029]/},{id:"log-log4shell-jndi",description:"Log4Shell: ${jndi:...} triggers remote code execution in Apache Log4j",pattern:/\$\{jndi\s*:/i},{id:"log-log4shell-obfuscated",description:"Obfuscated Log4Shell: ${::-j}... lookup-bypass prefix used to evade WAF detection",pattern:/\$\{::-/},{id:"log-log4j-lookup",description:"Log4j lookup syntax: ${env:...}, ${sys:...}, ${ctx:...} \u2014 data exfiltration",pattern:/\$\{(?:env|sys|ctx|main|map|sd|web|docker|k8s|spring)\s*:/i},{id:"log-ssti-double-brace",description:"SSTI double-brace: {{expression}} \u2014 Jinja2, Twig, Handlebars, etc.",pattern:/\{\{[\s\S]{0,80}\}\}/},{id:"log-ssti-hash-brace",description:"SSTI hash-brace: #{expression} \u2014 Thymeleaf, Velocity, Ruby ERB",pattern:/#\{[\s\S]{0,80}\}/},{id:"log-ssti-dollar-brace",description:"SSTI/EL injection: ${expression with operators or method calls} \u2014 JSP EL, Freemarker, SpEL",pattern:/\$\{[^}]*(?:\.|\(|\*|\+|\bclass\b|\bruntime\b|\bprocess\b|\bexec\b)[^}]{0,80}\}/i},{id:"log-ssti-percent-tag",description:"SSTI ERB/ASP tag: <%= expression %> \u2014 Ruby ERB, ASP",pattern:/<%=[\s\S]{0,80}%>/},{id:"log-null-byte",description:"Null byte: \\x00 or %00 \u2014 can truncate log entries in C-backed loggers",pattern:/\x00|%00/},{id:"log-ansi-escape",description:"ANSI escape sequence: ESC[ \u2014 can manipulate terminal output when logs are tailed",pattern:/\x1b\[/}],k8=eQ;var JW=[{id:"sql-line-comment",description:"SQL line comment: -- followed by whitespace or end of string",pattern:/--(?:\s|$)/},{id:"sql-stacked-query",description:"Stacked queries: semicolon immediately followed by a SQL keyword",pattern:/;\s{0,10}(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b/i},{id:"sql-hex-encoding",description:"Hex-encoded string injection: 0x41414141 style (MySQL)",pattern:/\b0x[0-9a-f]{4,}/i}],QW=[...n5,...JW],S8=QW;M5.label="HTML";P5.label="XML";T8.label="SVG";n5.label="SQL";S8.label="SQL-STRICT";E8.label="SHELL";N8.label="REDOS";D8.label="NOSQL";k8.label="LOG";var Bz=Object.freeze({HTML:M5,XML:P5,SVG:T8,SQL:n5,"SQL-STRICT":S8,SHELL:E8,REDOS:N8,NOSQL:D8,LOG:k8});function WW(J){if(typeof J!=="string")throw TypeError(`is-unsafe: first argument must be a string, got ${typeof J}`)}function YW(J){if(J instanceof RegExp)return;if(Array.isArray(J)){if(J.length===0)throw TypeError("is-unsafe: context must not be an empty array");if(Array.isArray(J[0])){for(let Q of J)if(!Array.isArray(Q)||Q.length===0)throw TypeError("is-unsafe: each context in the array must be a non-empty pattern array (PatternList)")}return}throw TypeError(`is-unsafe: second argument must be a PatternList (e.g. HTML), an array of PatternLists (e.g. [HTML, XML]), or a RegExp. Got: ${typeof J}`)}function GW(J){if(J instanceof RegExp)return{lists:null,regex:J};if(Array.isArray(J[0]))return{lists:J,regex:null};return{lists:[J],regex:null}}function UW(J,Q){let W=Q.label??"CUSTOM";for(let Y of Q)if(Y.pattern.test(J))return{context:W,id:Y.id,description:Y.description,pattern:Y.pattern};return null}function M7(J,Q){WW(J),YW(Q);let{lists:W,regex:Y}=GW(Q);if(Y)return Y.test(J);for(let U of W)if(UW(J,U)!==null)return!0;return!1}function zW(J,Q){if(!J)return{};let W=Q.attributesGroupName?J[Q.attributesGroupName]:J;if(!W)return{};let Y={};for(let U in W)if(U.startsWith(Q.attributeNamePrefix)){let G=U.substring(Q.attributeNamePrefix.length);Y[G]=W[U]}else Y[U]=W[U];return Y}function ZW(J){if(!J||typeof J!=="string")return;let Q=J.indexOf(":");if(Q!==-1&&Q>0){let W=J.substring(0,Q);if(W!=="xmlns")return W}return}class b6{constructor(J,Q){this.options=J,this.currentNode=null,this.tagsNodeStack=[],this.parseXml=HW,this.parseTextData=KW,this.resolveNameSpace=FW,this.buildAttributesMap=$W,this.isItStopNode=BW,this.replaceEntitiesValue=qW,this.readStopNodeData=PW,this.saveTextToParentTag=LW,this.addChild=VW,this.ignoreAttributesFn=A8(this.options.ignoreAttributes),this.entityExpansionCount=0,this.currentExpandedLength=0,this.doctypefound=!1;let W={...g5};if(this.options.entityDecoder)this.entityDecoder=this.options.entityDecoder;else{if(typeof this.options.htmlEntities==="object")W=this.options.htmlEntities;else if(this.options.htmlEntities===!0)W={...B8,...L8};this.entityDecoder=new c5({namedEntities:{...W,...Q},numericAllowed:this.options.htmlEntities,limit:{maxTotalExpansions:this.options.processEntities.maxTotalExpansions,maxExpandedLength:this.options.processEntities.maxExpandedLength,applyLimitsTo:this.options.processEntities.appliesTo},onInputEntity:(U,G)=>M7(G,[M5,P5])?j5.BLOCK:j5.ALLOW})}this.matcher=new bJ,this.readonlyMatcher=this.matcher.readOnly(),this.isCurrentNodeStopNode=!1,this.stopNodeExpressionsSet=new l5;let Y=this.options.stopNodes;if(Y&&Y.length>0){for(let U=0;U<Y.length;U++){let G=Y[U];if(typeof G==="string")this.stopNodeExpressionsSet.add(new PJ(G));else if(G instanceof PJ)this.stopNodeExpressionsSet.add(G)}this.stopNodeExpressionsSet.seal()}}}function KW(J,Q,W,Y,U,G,Z){let K=this.options;if(J!==void 0){if(K.trimValues&&!Y)J=J.trim();if(J.length>0){if(!Z)J=this.replaceEntitiesValue(J,Q,W);let $=K.jPath?W.toString():W,z=K.tagValueProcessor(Q,J,$,U,G);if(z===null||z===void 0)return J;else if(typeof z!==typeof J||z!==J)return z;else if(K.trimValues)return y8(J,K.parseTagValue,K.numberParseOptions);else if(J.trim()===J)return y8(J,K.parseTagValue,K.numberParseOptions);else return J}}}function FW(J){if(this.options.removeNSPrefix){let Q=J.split(":"),W=J.charAt(0)==="/"?"/":"";if(Q[0]==="xmlns")return"";if(Q.length===2)J=W+Q[1]}return J}var XW=new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`,"gm");function $W(J,Q,W,Y=!1){let U=this.options;if(Y===!0||U.ignoreAttributes!==!0&&typeof J==="string"){let G=A6(J,XW),Z=G.length,K={},$=Array(Z),z=!1,F={};for(let V=0;V<Z;V++){let q=this.resolveNameSpace(G[V][1]),L=G[V][4];if(q.length&&L!==void 0){let M=L;if(U.trimValues)M=M.trim();M=this.replaceEntitiesValue(M,W,this.readonlyMatcher),$[V]=M,F[q]=M,z=!0}}if(z&&typeof Q==="object"&&Q.updateCurrent)Q.updateCurrent(F);let X=U.jPath?Q.toString():this.readonlyMatcher,H=!1;for(let V=0;V<Z;V++){let q=this.resolveNameSpace(G[V][1]);if(this.ignoreAttributesFn(q,X))continue;let L=U.attributeNamePrefix+q;if(q.length){if(U.transformAttributeName)L=U.transformAttributeName(L);if(L=P7(L,U),G[V][4]!==void 0){let M=$[V],B=U.attributeValueProcessor(q,M,X);if(B===null||B===void 0)K[L]=M;else if(typeof B!==typeof M||B!==M)K[L]=B;else K[L]=y8(M,U.parseAttributeValue,U.numberParseOptions);H=!0}else if(U.allowBooleanAttributes)K[L]=!0,H=!0}}if(!H)return;if(U.attributesGroupName&&!U.preserveOrder){let V={};return V[U.attributesGroupName]=K,V}return K}}var HW=function(J){J=J.replace(/\r\n?/g,`
`);let Q=new qJ("!xml"),W=Q,Y="";this.matcher.reset(),this.entityDecoder.reset(),this.entityExpansionCount=0,this.currentExpandedLength=0,this.doctypefound=!1;let U=this.options,G=new S6(U.processEntities),Z=J.length;for(let K=0;K<Z;K++)if(J[K]==="<"){let z=J.charCodeAt(K+1);if(z===47){let F=O5(J,">",K,"Closing Tag is not closed."),X=J.substring(K+2,F).trim();if(U.removeNSPrefix){let V=X.indexOf(":");if(V!==-1)X=X.substr(V+1)}if(X=I8(U.transformTagName,X,"",U).tagName,W)Y=this.saveTextToParentTag(Y,W,this.readonlyMatcher);let H=this.matcher.getCurrentTag();if(X&&U.unpairedTagsSet.has(X))throw Error(`Unpaired tag can not be used as closing tag: </${X}>`);if(H&&U.unpairedTagsSet.has(H))this.matcher.pop(),this.tagsNodeStack.pop();this.matcher.pop(),this.isCurrentNodeStopNode=!1,W=this.tagsNodeStack.pop(),Y="",K=F}else if(z===63){let F=w8(J,K,!1,"?>");if(!F)throw Error("Pi Tag is not closed.");Y=this.saveTextToParentTag(Y,W,this.readonlyMatcher);let X=this.buildAttributesMap(F.tagExp,this.matcher,F.tagName,!0);if(X){let H=X[this.options.attributeNamePrefix+"version"];this.entityDecoder.setXmlVersion(Number(H)||1),G.setXmlVersion(Number(H)||1)}if(U.ignoreDeclaration&&F.tagName==="?xml"||U.ignorePiTags);else{let H=new qJ(F.tagName);if(H.add(U.textNodeName,""),F.tagName!==F.tagExp&&F.attrExpPresent&&U.ignoreAttributes!==!0)H[":@"]=X;this.addChild(W,H,this.readonlyMatcher,K)}K=F.closeIndex+1}else if(z===33&&J.charCodeAt(K+2)===45&&J.charCodeAt(K+3)===45){let F=O5(J,"-->",K+4,"Comment is not closed.");if(U.commentPropName){let X=J.substring(K+4,F-2);Y=this.saveTextToParentTag(Y,W,this.readonlyMatcher),W.add(U.commentPropName,[{[U.textNodeName]:X}])}K=F}else if(z===33&&J.charCodeAt(K+2)===68){if(this.doctypefound)throw Error("Multiple DOCTYPE declarations found.");this.doctypefound=!0;let F=G.readDocType(J,K);this.entityDecoder.addInputEntities(F.entities),K=F.i}else if(z===33&&J.charCodeAt(K+2)===91){let F=O5(J,"]]>",K,"CDATA is not closed.")-2,X=J.substring(K+9,F);Y=this.saveTextToParentTag(Y,W,this.readonlyMatcher);let H=this.parseTextData(X,W.tagname,this.readonlyMatcher,!0,!1,!0,!0);if(H==null)H="";if(U.cdataPropName)W.add(U.cdataPropName,[{[U.textNodeName]:X}]);else W.add(U.textNodeName,H);K=F+2}else{let F=w8(J,K,U.removeNSPrefix);if(!F){let T=J.substring(Math.max(0,K-50),Math.min(Z,K+50));throw Error(`readTagExp returned undefined at position ${K}. Context: "${T}"`)}let{tagName:X,rawTagName:H,tagExp:V,attrExpPresent:q,closeIndex:L}=F;if({tagName:X,tagExp:V}=I8(U.transformTagName,X,V,U),U.strictReservedNames&&(X===U.commentPropName||X===U.cdataPropName||X===U.textNodeName||X===U.attributesGroupName))throw Error(`Invalid tag name: ${X}`);if(W&&Y){if(W.tagname!=="!xml")Y=this.saveTextToParentTag(Y,W,this.readonlyMatcher,!1)}let M=W;if(M&&U.unpairedTagsSet.has(M.tagname))W=this.tagsNodeStack.pop(),this.matcher.pop();let B=!1;if(V.length>0&&V.lastIndexOf("/")===V.length-1){if(B=!0,X[X.length-1]==="/")X=X.substr(0,X.length-1),V=X;else V=V.substr(0,V.length-1);q=X!==V}let j=null,O={},P=void 0;if(P=ZW(H),X!==Q.tagname)this.matcher.push(X,{},P);if(X!==V&&q){if(j=this.buildAttributesMap(V,this.matcher,X),j)O=zW(j,U)}if(X!==Q.tagname)this.isCurrentNodeStopNode=this.isItStopNode();let R=K;if(this.isCurrentNodeStopNode){let T="";if(B)K=F.closeIndex;else if(U.unpairedTagsSet.has(X))K=F.closeIndex;else{let D=this.readStopNodeData(J,H,L+1);if(!D)throw Error(`Unexpected end of ${H}`);K=D.i,T=D.tagContent}let A=new qJ(X);if(j)A[":@"]=j;A.add(U.textNodeName,T),this.matcher.pop(),this.isCurrentNodeStopNode=!1,this.addChild(W,A,this.readonlyMatcher,R)}else{if(B){({tagName:X,tagExp:V}=I8(U.transformTagName,X,V,U));let T=new qJ(X);if(j)T[":@"]=j;this.addChild(W,T,this.readonlyMatcher,R),this.matcher.pop(),this.isCurrentNodeStopNode=!1}else if(U.unpairedTagsSet.has(X)){let T=new qJ(X);if(j)T[":@"]=j;this.addChild(W,T,this.readonlyMatcher,R),this.matcher.pop(),this.isCurrentNodeStopNode=!1,K=F.closeIndex;continue}else{let T=new qJ(X);if(this.tagsNodeStack.length>U.maxNestedTags)throw Error("Maximum nested tags exceeded");if(this.tagsNodeStack.push(W),j)T[":@"]=j;this.addChild(W,T,this.readonlyMatcher,R),W=T}Y="",K=L}}}else Y+=J[K];return Q.child};function VW(J,Q,W,Y){if(!this.options.captureMetaData)Y=void 0;let U=this.options.jPath?W.toString():W,G=this.options.updateTag(Q.tagname,U,Q[":@"]);if(G===!1);else if(typeof G==="string")Q.tagname=G,J.addChild(Q,Y);else J.addChild(Q,Y)}function qW(J,Q,W){let Y=this.options.processEntities;if(!Y||!Y.enabled)return J;if(Y.allowedTags){let U=this.options.jPath?W.toString():W;if(!(Array.isArray(Y.allowedTags)?Y.allowedTags.includes(Q):Y.allowedTags(Q,U)))return J}if(Y.tagFilter){let U=this.options.jPath?W.toString():W;if(!Y.tagFilter(Q,U))return J}return this.entityDecoder.decode(J)}function LW(J,Q,W,Y){if(J){if(Y===void 0)Y=Q.child.length===0;if(J=this.parseTextData(J,Q.tagname,W,!1,Q[":@"]?Object.keys(Q[":@"]).length!==0:!1,Y),J!==void 0&&J!=="")Q.add(this.options.textNodeName,J);J=""}return J}function BW(){if(this.stopNodeExpressionsSet.size===0)return!1;return this.matcher.matchesAny(this.stopNodeExpressionsSet)}function jW(J,Q,W=">"){let Y=0,U=J.length,G=W.charCodeAt(0),Z=W.length>1?W.charCodeAt(1):-1,K="",$=Q;for(let z=Q;z<U;z++){let F=J.charCodeAt(z);if(Y){if(F===Y)Y=0}else if(F===34||F===39)Y=F;else if(F===G)if(Z!==-1){if(J.charCodeAt(z+1)===Z)return K+=J.substring($,z),{data:K,index:z}}else return K+=J.substring($,z),{data:K,index:z};else if(F===9&&!Y)K+=J.substring($,z)+" ",$=z+1}}function O5(J,Q,W,Y){let U=J.indexOf(Q,W);if(U===-1)throw Error(Y);else return U+Q.length-1}function MW(J,Q,W,Y){let U=J.indexOf(Q,W);if(U===-1)throw Error(Y);return U}function w8(J,Q,W,Y=">"){let U=jW(J,Q+1,Y);if(!U)return;let{data:G,index:Z}=U,K=G.search(/\s/),$=G,z=!0;if(K!==-1)$=G.substring(0,K),G=G.substring(K+1).trimStart();let F=$;if(W){let X=$.indexOf(":");if(X!==-1)$=$.substr(X+1),z=$!==U.data.substr(X+1)}return{tagName:$,tagExp:G,closeIndex:Z,attrExpPresent:z,rawTagName:F}}function PW(J,Q,W){let Y=W,U=1,G=J.length;for(;W<G;W++)if(J[W]==="<"){let Z=J.charCodeAt(W+1);if(Z===47){let K=MW(J,">",W,`${Q} is not closed`);if(J.substring(W+2,K).trim()===Q){if(U--,U===0)return{tagContent:J.substring(Y,W),i:K}}W=K}else if(Z===63)W=O5(J,"?>",W+1,"StopNode is not closed.");else if(Z===33&&J.charCodeAt(W+2)===45&&J.charCodeAt(W+3)===45)W=O5(J,"-->",W+3,"StopNode is not closed.");else if(Z===33&&J.charCodeAt(W+2)===91)W=O5(J,"]]>",W,"StopNode is not closed.")-2;else{let K=w8(J,W,!1);if(K){if((K&&K.tagName)===Q&&K.tagExp[K.tagExp.length-1]!=="/")U++;W=K.closeIndex}}}}function y8(J,Q,W){if(Q&&typeof J==="string"){let Y=J.trim();if(Y==="true")return!0;else if(Y==="false")return!1;else return R8(J,W)}else if(J7(J))return J;else return""}function I8(J,Q,W,Y){if(J){let U=J(Q);if(W===Q)W=U;Q=U}return Q=P7(Q,Y),{tagName:Q,tagExp:W}}function P7(J,Q){if(T6.includes(J))throw Error(`[SECURITY] Invalid name: "${J}" is a reserved JavaScript keyword that could cause prototype pollution`);else if(h5.includes(J))return Q.onDangerousProperty(J);return J}var b8=qJ.getMetaDataSymbol();function OW(J,Q){if(!J||typeof J!=="object")return{};if(!Q)return J;let W={};for(let Y in J)if(Y.startsWith(Q)){let U=Y.substring(Q.length);W[U]=J[Y]}else W[Y]=J[Y];return W}function _8(J,Q,W,Y){return O7(J,Q,W,Y)}function O7(J,Q,W,Y){let U,G={};for(let Z=0;Z<J.length;Z++){let K=J[Z],$=CW(K);if($!==void 0&&$!==Q.textNodeName){let z=OW(K[":@"]||{},Q.attributeNamePrefix);W.push($,z)}if($===Q.textNodeName)if(U===void 0)U=K[$];else U+=""+K[$];else if($===void 0)continue;else if(K[$]){let z=O7(K[$],Q,W,Y),F=AW(z,Q);if(Object.keys(z).length===0&&Q.alwaysCreateTextNode)z[Q.textNodeName]="";if(K[":@"])RW(z,K[":@"],Y,Q);else if(Object.keys(z).length===1&&z[Q.textNodeName]!==void 0&&!Q.alwaysCreateTextNode)z=z[Q.textNodeName];else if(Object.keys(z).length===0)if(Q.alwaysCreateTextNode)z[Q.textNodeName]="";else z="";if(K[b8]!==void 0&&typeof z==="object"&&z!==null)z[b8]=K[b8];if(G[$]!==void 0&&Object.prototype.hasOwnProperty.call(G,$)){if(!Array.isArray(G[$]))G[$]=[G[$]];G[$].push(z)}else{let X=Q.jPath?Y.toString():Y;if(Q.isArray($,X,F))G[$]=[z];else G[$]=z}if($!==void 0&&$!==Q.textNodeName)W.pop()}}if(typeof U==="string"){if(U.length>0)G[Q.textNodeName]=U}else if(U!==void 0)G[Q.textNodeName]=U;return G}function CW(J){let Q=Object.keys(J);for(let W=0;W<Q.length;W++){let Y=Q[W];if(Y!==":@")return Y}}function RW(J,Q,W,Y){if(Q){let U=Object.keys(Q),G=U.length;for(let Z=0;Z<G;Z++){let K=U[Z],$=K.startsWith(Y.attributeNamePrefix)?K.substring(Y.attributeNamePrefix.length):K,z=Y.jPath?W.toString()+"."+$:W;if(Y.isArray(K,z,!0,!0))J[K]=[Q[K]];else J[K]=Q[K]}}}function AW(J,Q){let{textNodeName:W}=Q,Y=Object.keys(J).length;if(Y===0)return!0;if(Y===1&&(J[W]||typeof J[W]==="boolean"||J[W]===0))return!0;return!1}class i5{constructor(J){this.externalEntities={},this.options=K7(J)}parse(J,Q){if(typeof J!=="string"&&J.toString)J=J.toString();else if(typeof J!=="string")throw Error("XML data is accepted in String or Bytes[] form.");if(Q){if(Q===!0)Q={};let U=E6(J,Q);if(U!==!0)throw Error(`${U.err.msg}:${U.err.line}:${U.err.col}`)}let W=new b6(this.options,this.externalEntities),Y=W.parseXml(J);if(this.options.preserveOrder||Y===void 0)return Y;else return _8(Y,this.options,W.matcher,W.readonlyMatcher)}addEntity(J,Q){if(Q.indexOf("&")!==-1)throw Error("Entity value can't have '&'");else if(J.indexOf("&")!==-1||J.indexOf(";")!==-1)throw Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");else if(Q==="&")throw Error("An entity with value '&' is not permitted");else this.externalEntities[J]=Q}static getMetaDataSymbol(){return qJ.getMetaDataSymbol()}}function o5(J){return String(J).replace(/--/g,"- -").replace(/--/g,"- -").replace(/-$/,"- ")}function _6(J){return String(J).replace(/\]\]>/g,"]]]]><![CDATA[>")}function EJ(J){return String(J).replace(/"/g,"&quot;").replace(/'/g,"&apos;")}var TW=`
`;function EW(J,Q){if(!Array.isArray(J)||J.length===0)return"1.0";let W=J[0];if(x8(W)==="?xml"){let U=W[":@"];if(U){let G=Q.attributeNamePrefix+"version";if(U[G])return U[G]}}return"1.0"}function R7(J,Q,W,Y,U){if(!W.sanitizeName)return J;if(U(J))return J;return W.sanitizeName(J,{isAttribute:Q,matcher:Y.readOnly()})}function v8(J,Q){let W="";if(Q.format)W=TW;let Y=[];if(Q.stopNodes&&Array.isArray(Q.stopNodes))for(let K=0;K<Q.stopNodes.length;K++){let $=Q.stopNodes[K];if(typeof $==="string")Y.push(new PJ($));else if($ instanceof PJ)Y.push($)}let U=EW(J,Q),G=k6("qName",{xmlVersion:U}),Z=new bJ;return A7(J,Q,W,Z,Y,G)}function A7(J,Q,W,Y,U,G){let Z="",K=!1;if(Q.maxNestedTags&&Y.getDepth()>Q.maxNestedTags)throw Error("Maximum nested tags exceeded");if(!Array.isArray(J)){if(J!==void 0&&J!==null){let $=J.toString();return $=f8($,Q),$}return""}for(let $=0;$<J.length;$++){let z=J[$],F=x8(z);if(F===void 0)continue;let H=F===Q.textNodeName||F===Q.cdataPropName||F===Q.commentPropName||F[0]==="?"?F:R7(F,!1,Q,Y,G),V=NW(z[":@"],Q);Y.push(H,V);let q=kW(Y,U);if(H===Q.textNodeName){let O=z[F];if(!q)O=Q.tagValueProcessor(H,O),O=f8(O,Q);if(K)Z+=W;Z+=O,K=!1,Y.pop();continue}else if(H===Q.cdataPropName){if(K)Z+=W;let O=z[F][0][Q.textNodeName],P=_6(O);Z+=`<![CDATA[${P}]]>`,K=!1,Y.pop();continue}else if(H===Q.commentPropName){let O=z[F][0][Q.textNodeName],P=o5(O);Z+=W+`<!--${P}-->`,K=!0,Y.pop();continue}else if(H[0]==="?"){let O=C7(z[":@"],Q,q,Y,G);Z+=(H==="?xml"?"":W)+`<${H}${O}?>`,K=!0,Y.pop();continue}let L=W;if(L!=="")L+=Q.indentBy;let M=C7(z[":@"],Q,q,Y,G),B=W+`<${H}${M}`,j;if(q)j=T7(z[F],Q);else j=A7(z[F],Q,L,Y,U,G);if(Q.unpairedTags.indexOf(H)!==-1)if(Q.suppressUnpairedNode)Z+=B+">";else Z+=B+"/>";else if((!j||j.length===0)&&Q.suppressEmptyNode)Z+=B+"/>";else if(j&&j.endsWith(">"))Z+=B+`>${j}${W}</${H}>`;else{if(Z+=B+">",j&&W!==""&&(j.includes("/>")||j.includes("</")))Z+=W+Q.indentBy+j+W;else Z+=j;Z+=`</${H}>`}K=!0,Y.pop()}return Z}function NW(J,Q){if(!J||Q.ignoreAttributes)return null;let W={},Y=!1;for(let U in J){if(!Object.prototype.hasOwnProperty.call(J,U))continue;let G=U.startsWith(Q.attributeNamePrefix)?U.substr(Q.attributeNamePrefix.length):U;W[G]=EJ(J[U]),Y=!0}return Y?W:null}function T7(J,Q){if(!Array.isArray(J)){if(J!==void 0&&J!==null)return J.toString();return""}let W="";for(let Y=0;Y<J.length;Y++){let U=J[Y],G=x8(U);if(G===Q.textNodeName)W+=U[G];else if(G===Q.cdataPropName)W+=U[G][0][Q.textNodeName];else if(G===Q.commentPropName)W+=U[G][0][Q.textNodeName];else if(G&&G[0]==="?")continue;else if(G){let Z=DW(U[":@"],Q),K=T7(U[G],Q);if(!K||K.length===0)W+=`<${G}${Z}/>`;else W+=`<${G}${Z}>${K}</${G}>`}}return W}function DW(J,Q){let W="";if(J&&!Q.ignoreAttributes)for(let Y in J){if(!Object.prototype.hasOwnProperty.call(J,Y))continue;let U=J[Y];if(U===!0&&Q.suppressBooleanAttributes)W+=` ${Y.substr(Q.attributeNamePrefix.length)}`;else W+=` ${Y.substr(Q.attributeNamePrefix.length)}="${EJ(U)}"`}return W}function x8(J){let Q=Object.keys(J);for(let W=0;W<Q.length;W++){let Y=Q[W];if(!Object.prototype.hasOwnProperty.call(J,Y))continue;if(Y!==":@")return Y}}function C7(J,Q,W,Y,U){let G="";if(J&&!Q.ignoreAttributes)for(let Z in J){if(!Object.prototype.hasOwnProperty.call(J,Z))continue;let K=Z.substr(Q.attributeNamePrefix.length),$=W?K:R7(K,!0,Q,Y,U),z;if(W)z=J[Z];else z=Q.attributeValueProcessor(Z,J[Z]),z=f8(z,Q);if(z===!0&&Q.suppressBooleanAttributes)G+=` ${$}`;else G+=` ${$}="${EJ(z)}"`}return G}function kW(J,Q){if(!Q||Q.length===0)return!1;for(let W=0;W<Q.length;W++)if(J.matches(Q[W]))return!0;return!1}function f8(J,Q){if(J&&J.length>0&&Q.processEntities)for(let W=0;W<Q.entities.length;W++){let Y=Q.entities[W];J=J.replace(Y.regex,Y.val)}return J}function h8(J){if(typeof J==="function")return J;if(Array.isArray(J))return(Q)=>{for(let W of J){if(typeof W==="string"&&Q===W)return!0;if(W instanceof RegExp&&W.test(Q))return!0}};return()=>!1}var SW={attributeNamePrefix:"@_",attributesGroupName:!1,textNodeName:"#text",ignoreAttributes:!0,cdataPropName:!1,format:!1,indentBy:"  ",suppressEmptyNode:!1,suppressUnpairedNode:!0,suppressBooleanAttributes:!0,tagValueProcessor:function(J,Q){return Q},attributeValueProcessor:function(J,Q){return Q},preserveOrder:!1,commentPropName:!1,unpairedTags:[],entities:[{regex:new RegExp("&","g"),val:"&amp;"},{regex:new RegExp(">","g"),val:"&gt;"},{regex:new RegExp("<","g"),val:"&lt;"},{regex:new RegExp("'","g"),val:"&apos;"},{regex:new RegExp('"',"g"),val:"&quot;"}],processEntities:!0,stopNodes:[],oneListGroup:!1,maxNestedTags:100,jPath:!0,sanitizeName:!1};function $J(J){if(this.options=Object.assign({},SW,J),this.options.stopNodes&&Array.isArray(this.options.stopNodes))this.options.stopNodes=this.options.stopNodes.map((Q)=>{if(typeof Q==="string"&&Q.startsWith("*."))return"."+"."+Q.substring(2);return Q});if(this.stopNodeExpressions=[],this.options.stopNodes&&Array.isArray(this.options.stopNodes))for(let Q=0;Q<this.options.stopNodes.length;Q++){let W=this.options.stopNodes[Q];if(typeof W==="string")this.stopNodeExpressions.push(new PJ(W));else if(W instanceof PJ)this.stopNodeExpressions.push(W)}if(this.options.ignoreAttributes===!0||this.options.attributesGroupName)this.isAttribute=function(){return!1};else this.ignoreAttributesFn=h8(this.options.ignoreAttributes),this.attrPrefixLen=this.options.attributeNamePrefix.length,this.isAttribute=bW;if(this.processTextOrObjNode=wW,this.options.format)this.indentate=yW,this.tagEndChar=`>
`,this.newLine=`
`;else this.indentate=function(){return""},this.tagEndChar=">",this.newLine=""}function IW(J,Q){let W=J["?xml"];if(W&&typeof W==="object"){if(Q.attributesGroupName&&W[Q.attributesGroupName]){let U=W[Q.attributesGroupName][Q.attributeNamePrefix+"version"];if(U)return U}let Y=W[Q.attributeNamePrefix+"version"];if(Y)return Y}return"1.0"}function u8(J,Q,W,Y,U){if(!W.sanitizeName)return J;if(U(J))return J;return W.sanitizeName(J,{isAttribute:Q,matcher:Y.readOnly()})}$J.prototype.build=function(J){if(this.options.preserveOrder)return v8(J,this.options);else{if(Array.isArray(J)&&this.options.arrayNodeName&&this.options.arrayNodeName.length>1)J={[this.options.arrayNodeName]:J};let Q=new bJ,W=IW(J,this.options),Y=k6("qName",{xmlVersion:W});return this.j2x(J,0,Q,Y).val}};$J.prototype.j2x=function(J,Q,W,Y){let U="",G="";if(this.options.maxNestedTags&&W.getDepth()>=this.options.maxNestedTags)throw Error("Maximum nested tags exceeded");let Z=this.options.jPath?W.toString():W,K=this.checkStopNode(W);for(let $ in J){if(!Object.prototype.hasOwnProperty.call(J,$))continue;let F=$===this.options.textNodeName||$===this.options.cdataPropName||$===this.options.commentPropName||this.options.attributesGroupName&&$===this.options.attributesGroupName||this.isAttribute($)||$[0]==="?"?$:u8($,!1,this.options,W,Y);if(typeof J[$]>"u"){if(this.isAttribute($))G+=""}else if(J[$]===null)if(this.isAttribute($))G+="";else if(F===this.options.cdataPropName||F===this.options.commentPropName)G+="";else if(F[0]==="?")G+=this.indentate(Q)+"<"+F+"?"+this.tagEndChar;else G+=this.indentate(Q)+"<"+F+"/"+this.tagEndChar;else if(J[$]instanceof Date)G+=this.buildTextValNode(J[$],F,"",Q,W);else if(typeof J[$]!=="object"){let X=this.isAttribute($);if(X&&!this.ignoreAttributesFn(X,Z)){let H=u8(X,!0,this.options,W,Y);U+=this.buildAttrPairStr(H,""+J[$],K)}else if(!X)if($===this.options.textNodeName){let H=this.options.tagValueProcessor($,""+J[$]);G+=this.replaceEntitiesValue(H)}else{W.push(F);let H=this.checkStopNode(W);if(W.pop(),H){let V=""+J[$];if(V==="")G+=this.indentate(Q)+"<"+F+this.closeTag(F)+this.tagEndChar;else G+=this.indentate(Q)+"<"+F+">"+V+"</"+F+this.tagEndChar}else G+=this.buildTextValNode(J[$],F,"",Q,W)}}else if(Array.isArray(J[$])){let X=J[$].length,H="",V="";for(let q=0;q<X;q++){let L=J[$][q];if(typeof L>"u");else if(L===null)if(F[0]==="?")G+=this.indentate(Q)+"<"+F+"?"+this.tagEndChar;else G+=this.indentate(Q)+"<"+F+"/"+this.tagEndChar;else if(typeof L==="object")if(this.options.oneListGroup){W.push(F);let M=this.j2x(L,Q+1,W,Y);if(W.pop(),H+=M.val,this.options.attributesGroupName&&L.hasOwnProperty(this.options.attributesGroupName))V+=M.attrStr}else H+=this.processTextOrObjNode(L,F,Q,W,Y);else if(this.options.oneListGroup){let M=this.options.tagValueProcessor(F,L);M=this.replaceEntitiesValue(M),H+=M}else{W.push(F);let M=this.checkStopNode(W);if(W.pop(),M){let B=""+L;if(B==="")H+=this.indentate(Q)+"<"+F+this.closeTag(F)+this.tagEndChar;else H+=this.indentate(Q)+"<"+F+">"+B+"</"+F+this.tagEndChar}else H+=this.buildTextValNode(L,F,"",Q,W)}}if(this.options.oneListGroup)H=this.buildObjectNode(H,F,V,Q);G+=H}else if(this.options.attributesGroupName&&$===this.options.attributesGroupName){let X=Object.keys(J[$]),H=X.length;for(let V=0;V<H;V++){let q=u8(X[V],!0,this.options,W,Y);U+=this.buildAttrPairStr(q,""+J[$][X[V]],K)}}else G+=this.processTextOrObjNode(J[$],F,Q,W,Y)}return{attrStr:U,val:G}};$J.prototype.buildAttrPairStr=function(J,Q,W){if(!W)Q=this.options.attributeValueProcessor(J,""+Q),Q=this.replaceEntitiesValue(Q);if(this.options.suppressBooleanAttributes&&Q==="true")return" "+J;else return" "+J+'="'+EJ(Q)+'"'};function wW(J,Q,W,Y,U){let G=this.extractAttributes(J);if(Y.push(Q,G),this.checkStopNode(Y)){let $=this.buildRawContent(J),z=this.buildAttributesForStopNode(J);return Y.pop(),this.buildObjectNode($,Q,z,W)}let K=this.j2x(J,W+1,Y,U);if(Y.pop(),Q[0]==="?")return this.buildTextValNode("",Q,K.attrStr,W,Y);else if(J[this.options.textNodeName]!==void 0&&Object.keys(J).length===1)return this.buildTextValNode(J[this.options.textNodeName],Q,K.attrStr,W,Y);else return this.buildObjectNode(K.val,Q,K.attrStr,W)}$J.prototype.extractAttributes=function(J){if(!J||typeof J!=="object")return null;let Q={},W=!1;if(this.options.attributesGroupName&&J[this.options.attributesGroupName]){let Y=J[this.options.attributesGroupName];for(let U in Y){if(!Object.prototype.hasOwnProperty.call(Y,U))continue;let G=U.startsWith(this.options.attributeNamePrefix)?U.substring(this.options.attributeNamePrefix.length):U;Q[G]=EJ(Y[U]),W=!0}}else for(let Y in J){if(!Object.prototype.hasOwnProperty.call(J,Y))continue;let U=this.isAttribute(Y);if(U)Q[U]=EJ(J[Y]),W=!0}return W?Q:null};$J.prototype.buildRawContent=function(J){if(typeof J==="string")return J;if(typeof J!=="object"||J===null)return String(J);if(J[this.options.textNodeName]!==void 0)return J[this.options.textNodeName];let Q="";for(let W in J){if(!Object.prototype.hasOwnProperty.call(J,W))continue;if(this.isAttribute(W))continue;if(this.options.attributesGroupName&&W===this.options.attributesGroupName)continue;let Y=J[W];if(W===this.options.textNodeName)Q+=Y;else if(Array.isArray(Y)){for(let U of Y)if(typeof U==="string"||typeof U==="number")Q+=`<${W}>${U}</${W}>`;else if(typeof U==="object"&&U!==null){let G=this.buildRawContent(U),Z=this.buildAttributesForStopNode(U);if(G==="")Q+=`<${W}${Z}/>`;else Q+=`<${W}${Z}>${G}</${W}>`}}else if(typeof Y==="object"&&Y!==null){let U=this.buildRawContent(Y),G=this.buildAttributesForStopNode(Y);if(U==="")Q+=`<${W}${G}/>`;else Q+=`<${W}${G}>${U}</${W}>`}else Q+=`<${W}>${Y}</${W}>`}return Q};$J.prototype.buildAttributesForStopNode=function(J){if(!J||typeof J!=="object")return"";let Q="";if(this.options.attributesGroupName&&J[this.options.attributesGroupName]){let W=J[this.options.attributesGroupName];for(let Y in W){if(!Object.prototype.hasOwnProperty.call(W,Y))continue;let U=Y.startsWith(this.options.attributeNamePrefix)?Y.substring(this.options.attributeNamePrefix.length):Y,G=W[Y];if(G===!0&&this.options.suppressBooleanAttributes)Q+=" "+U;else Q+=" "+U+'="'+EJ(G)+'"'}}else for(let W in J){if(!Object.prototype.hasOwnProperty.call(J,W))continue;let Y=this.isAttribute(W);if(Y){let U=J[W];if(U===!0&&this.options.suppressBooleanAttributes)Q+=" "+Y;else Q+=" "+Y+'="'+EJ(U)+'"'}}return Q};$J.prototype.buildObjectNode=function(J,Q,W,Y){if(J==="")if(Q[0]==="?")return this.indentate(Y)+"<"+Q+W+"?"+this.tagEndChar;else return this.indentate(Y)+"<"+Q+W+this.closeTag(Q)+this.tagEndChar;else if(Q[0]==="?")return this.indentate(Y)+"<"+Q+W+"?"+this.tagEndChar;else{let U="</"+Q+this.tagEndChar,G="";if(Q[0]==="?")G="?",U="";if((W||W==="")&&J.indexOf("<")===-1)return this.indentate(Y)+"<"+Q+W+G+">"+J+U;else if(this.options.commentPropName!==!1&&Q===this.options.commentPropName&&G.length===0)return this.indentate(Y)+`<!--${o5(J)}-->`+this.newLine;else return this.indentate(Y)+"<"+Q+W+G+this.tagEndChar+J+this.indentate(Y)+U}};$J.prototype.closeTag=function(J){let Q="";if(this.options.unpairedTags.indexOf(J)!==-1){if(!this.options.suppressUnpairedNode)Q="/"}else if(this.options.suppressEmptyNode)Q="/";else Q=`></${J}`;return Q};$J.prototype.checkStopNode=function(J){if(!this.stopNodeExpressions||this.stopNodeExpressions.length===0)return!1;for(let Q=0;Q<this.stopNodeExpressions.length;Q++)if(J.matches(this.stopNodeExpressions[Q]))return!0;return!1};$J.prototype.buildTextValNode=function(J,Q,W,Y,U){if(this.options.cdataPropName!==!1&&Q===this.options.cdataPropName){let G=_6(J);return this.indentate(Y)+`<![CDATA[${G}]]>`+this.newLine}else if(this.options.commentPropName!==!1&&Q===this.options.commentPropName){let G=o5(J);return this.indentate(Y)+`<!--${G}-->`+this.newLine}else if(Q[0]==="?")return this.indentate(Y)+"<"+Q+W+"?"+this.tagEndChar;else{let G=this.options.tagValueProcessor(Q,J);if(G=this.replaceEntitiesValue(G),G==="")return this.indentate(Y)+"<"+Q+W+this.closeTag(Q)+this.tagEndChar;else return this.indentate(Y)+"<"+Q+W+">"+G+"</"+Q+this.tagEndChar}};$J.prototype.replaceEntitiesValue=function(J){if(J&&J.length>0&&this.options.processEntities)for(let Q=0;Q<this.options.entities.length;Q++){let W=this.options.entities[Q];J=J.replace(W.regex,W.val)}return J};function yW(J){return this.options.indentBy.repeat(J)}function bW(J){if(J.startsWith(this.options.attributeNamePrefix)&&J!==this.options.textNodeName)return J.substr(this.attrPrefixLen);else return!1}var g8=$J;var f6={validate:E6};/*! pako 2.2.0 https://github.com/nodeca/pako @license (MIT AND Zlib) */function D5(J){let Q=J.length;while(--Q>=0)J[Q]=0}var _W=0,$9=1,fW=2,vW=3,xW=258,X0=29,K6=256,Q6=K6+1+X0,A5=30,$0=19,H9=2*Q6+1,Q5=15,m8=16,hW=7,H0=256,V9=16,q9=17,L9=18,Q0=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),m6=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),uW=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),B9=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),gW=512,fJ=Array((Q6+2)*2);D5(fJ);var t5=Array(A5*2);D5(t5);var W6=Array(gW);D5(W6);var Y6=Array(xW-vW+1);D5(Y6);var V0=Array(X0);D5(V0);var c6=Array(A5);D5(c6);function c8(J,Q,W,Y,U){this.static_tree=J,this.extra_bits=Q,this.extra_base=W,this.elems=Y,this.max_length=U,this.has_stree=J&&J.length}var j9,M9,P9;function p8(J,Q){this.dyn_tree=J,this.max_code=0,this.stat_desc=Q}var O9=(J)=>{return J<256?W6[J]:W6[256+(J>>>7)]},G6=(J,Q)=>{J.pending_buf[J.pending++]=Q&255,J.pending_buf[J.pending++]=Q>>>8&255},HJ=(J,Q,W)=>{if(J.bi_valid>m8-W)J.bi_buf|=Q<<J.bi_valid&65535,G6(J,J.bi_buf),J.bi_buf=Q>>m8-J.bi_valid,J.bi_valid+=W-m8;else J.bi_buf|=Q<<J.bi_valid&65535,J.bi_valid+=W},kJ=(J,Q,W)=>{HJ(J,W[Q*2],W[Q*2+1])},C9=(J,Q)=>{let W=0;do W|=J&1,J>>>=1,W<<=1;while(--Q>0);return W>>>1},mW=(J)=>{if(J.bi_valid===16)G6(J,J.bi_buf),J.bi_buf=0,J.bi_valid=0;else if(J.bi_valid>=8)J.pending_buf[J.pending++]=J.bi_buf&255,J.bi_buf>>=8,J.bi_valid-=8},cW=(J,Q)=>{let{dyn_tree:W,max_code:Y}=Q,U=Q.stat_desc.static_tree,G=Q.stat_desc.has_stree,Z=Q.stat_desc.extra_bits,K=Q.stat_desc.extra_base,$=Q.stat_desc.max_length,z,F,X,H,V,q,L=0;for(H=0;H<=Q5;H++)J.bl_count[H]=0;W[J.heap[J.heap_max]*2+1]=0;for(z=J.heap_max+1;z<H9;z++){if(F=J.heap[z],H=W[W[F*2+1]*2+1]+1,H>$)H=$,L++;if(W[F*2+1]=H,F>Y)continue;if(J.bl_count[H]++,V=0,F>=K)V=Z[F-K];if(q=W[F*2],J.opt_len+=q*(H+V),G)J.static_len+=q*(U[F*2+1]+V)}if(L===0)return;do{H=$-1;while(J.bl_count[H]===0)H--;J.bl_count[H]--,J.bl_count[H+1]+=2,J.bl_count[$]--,L-=2}while(L>0);for(H=$;H!==0;H--){F=J.bl_count[H];while(F!==0){if(X=J.heap[--z],X>Y)continue;if(W[X*2+1]!==H)J.opt_len+=(H-W[X*2+1])*W[X*2],W[X*2+1]=H;F--}}},R9=(J,Q,W)=>{let Y=Array(Q5+1),U=0,G,Z;for(G=1;G<=Q5;G++)U=U+W[G-1]<<1,Y[G]=U;for(Z=0;Z<=Q;Z++){let K=J[Z*2+1];if(K===0)continue;J[Z*2]=C9(Y[K]++,K)}},pW=()=>{let J,Q,W,Y,U,G=Array(Q5+1);W=0;for(Y=0;Y<X0-1;Y++){V0[Y]=W;for(J=0;J<1<<Q0[Y];J++)Y6[W++]=Y}Y6[W-1]=Y,U=0;for(Y=0;Y<16;Y++){c6[Y]=U;for(J=0;J<1<<m6[Y];J++)W6[U++]=Y}U>>=7;for(;Y<A5;Y++){c6[Y]=U<<7;for(J=0;J<1<<m6[Y]-7;J++)W6[256+U++]=Y}for(Q=0;Q<=Q5;Q++)G[Q]=0;J=0;while(J<=143)fJ[J*2+1]=8,J++,G[8]++;while(J<=255)fJ[J*2+1]=9,J++,G[9]++;while(J<=279)fJ[J*2+1]=7,J++,G[7]++;while(J<=287)fJ[J*2+1]=8,J++,G[8]++;R9(fJ,Q6+1,G);for(J=0;J<A5;J++)t5[J*2+1]=5,t5[J*2]=C9(J,5);j9=new c8(fJ,Q0,K6+1,Q6,Q5),M9=new c8(t5,m6,0,A5,Q5),P9=new c8([],uW,0,$0,hW)},A9=(J)=>{let Q;for(Q=0;Q<Q6;Q++)J.dyn_ltree[Q*2]=0;for(Q=0;Q<A5;Q++)J.dyn_dtree[Q*2]=0;for(Q=0;Q<$0;Q++)J.bl_tree[Q*2]=0;J.dyn_ltree[H0*2]=1,J.opt_len=J.static_len=0,J.sym_next=J.matches=0},T9=(J)=>{if(J.bi_valid>8)G6(J,J.bi_buf);else if(J.bi_valid>0)J.pending_buf[J.pending++]=J.bi_buf;J.bi_buf=0,J.bi_valid=0},E7=(J,Q,W,Y)=>{let U=Q*2,G=W*2;return J[U]<J[G]||J[U]===J[G]&&Y[Q]<=Y[W]},d8=(J,Q,W)=>{let Y=J.heap[W],U=W<<1;while(U<=J.heap_len){if(U<J.heap_len&&E7(Q,J.heap[U+1],J.heap[U],J.depth))U++;if(E7(Q,Y,J.heap[U],J.depth))break;J.heap[W]=J.heap[U],W=U,U<<=1}J.heap[W]=Y},N7=(J,Q,W)=>{let Y,U,G=0,Z,K;if(J.sym_next!==0)do if(Y=J.pending_buf[J.sym_buf+G++]&255,Y+=(J.pending_buf[J.sym_buf+G++]&255)<<8,U=J.pending_buf[J.sym_buf+G++],Y===0)kJ(J,U,Q);else{if(Z=Y6[U],kJ(J,Z+K6+1,Q),K=Q0[Z],K!==0)U-=V0[Z],HJ(J,U,K);if(Y--,Z=O9(Y),kJ(J,Z,W),K=m6[Z],K!==0)Y-=c6[Z],HJ(J,Y,K)}while(G<J.sym_next);kJ(J,H0,Q)},W0=(J,Q)=>{let W=Q.dyn_tree,Y=Q.stat_desc.static_tree,U=Q.stat_desc.has_stree,G=Q.stat_desc.elems,Z,K,$=-1,z;J.heap_len=0,J.heap_max=H9;for(Z=0;Z<G;Z++)if(W[Z*2]!==0)J.heap[++J.heap_len]=$=Z,J.depth[Z]=0;else W[Z*2+1]=0;while(J.heap_len<2)if(z=J.heap[++J.heap_len]=$<2?++$:0,W[z*2]=1,J.depth[z]=0,J.opt_len--,U)J.static_len-=Y[z*2+1];Q.max_code=$;for(Z=J.heap_len>>1;Z>=1;Z--)d8(J,W,Z);z=G;do Z=J.heap[1],J.heap[1]=J.heap[J.heap_len--],d8(J,W,1),K=J.heap[1],J.heap[--J.heap_max]=Z,J.heap[--J.heap_max]=K,W[z*2]=W[Z*2]+W[K*2],J.depth[z]=(J.depth[Z]>=J.depth[K]?J.depth[Z]:J.depth[K])+1,W[Z*2+1]=W[K*2+1]=z,J.heap[1]=z++,d8(J,W,1);while(J.heap_len>=2);J.heap[--J.heap_max]=J.heap[1],cW(J,Q),R9(W,$,J.bl_count)},D7=(J,Q,W)=>{let Y,U=-1,G,Z=Q[1],K=0,$=7,z=4;if(Z===0)$=138,z=3;Q[(W+1)*2+1]=65535;for(Y=0;Y<=W;Y++){if(G=Z,Z=Q[(Y+1)*2+1],++K<$&&G===Z)continue;else if(K<z)J.bl_tree[G*2]+=K;else if(G!==0){if(G!==U)J.bl_tree[G*2]++;J.bl_tree[V9*2]++}else if(K<=10)J.bl_tree[q9*2]++;else J.bl_tree[L9*2]++;if(K=0,U=G,Z===0)$=138,z=3;else if(G===Z)$=6,z=3;else $=7,z=4}},k7=(J,Q,W)=>{let Y,U=-1,G,Z=Q[1],K=0,$=7,z=4;if(Z===0)$=138,z=3;for(Y=0;Y<=W;Y++){if(G=Z,Z=Q[(Y+1)*2+1],++K<$&&G===Z)continue;else if(K<z)do kJ(J,G,J.bl_tree);while(--K!==0);else if(G!==0){if(G!==U)kJ(J,G,J.bl_tree),K--;kJ(J,V9,J.bl_tree),HJ(J,K-3,2)}else if(K<=10)kJ(J,q9,J.bl_tree),HJ(J,K-3,3);else kJ(J,L9,J.bl_tree),HJ(J,K-11,7);if(K=0,U=G,Z===0)$=138,z=3;else if(G===Z)$=6,z=3;else $=7,z=4}},dW=(J)=>{let Q;D7(J,J.dyn_ltree,J.l_desc.max_code),D7(J,J.dyn_dtree,J.d_desc.max_code),W0(J,J.bl_desc);for(Q=$0-1;Q>=3;Q--)if(J.bl_tree[B9[Q]*2+1]!==0)break;return J.opt_len+=3*(Q+1)+5+5+4,Q},lW=(J,Q,W,Y)=>{let U;HJ(J,Q-257,5),HJ(J,W-1,5),HJ(J,Y-4,4);for(U=0;U<Y;U++)HJ(J,J.bl_tree[B9[U]*2+1],3);k7(J,J.dyn_ltree,Q-1),k7(J,J.dyn_dtree,W-1)},nW=(J)=>{let Q=4093624447,W;for(W=0;W<=31;W++,Q>>>=1)if(Q&1&&J.dyn_ltree[W*2]!==0)return 0;if(J.dyn_ltree[18]!==0||J.dyn_ltree[20]!==0||J.dyn_ltree[26]!==0)return 1;for(W=32;W<K6;W++)if(J.dyn_ltree[W*2]!==0)return 1;return 0},S7=!1,iW=(J)=>{if(!S7)pW(),S7=!0;J.l_desc=new p8(J.dyn_ltree,j9),J.d_desc=new p8(J.dyn_dtree,M9),J.bl_desc=new p8(J.bl_tree,P9),J.bi_buf=0,J.bi_valid=0,A9(J)},E9=(J,Q,W,Y)=>{if(HJ(J,(_W<<1)+(Y?1:0),3),T9(J),G6(J,W),G6(J,~W),W)J.pending_buf.set(J.window.subarray(Q,Q+W),J.pending);J.pending+=W},oW=(J)=>{HJ(J,$9<<1,3),kJ(J,H0,fJ),mW(J)},rW=(J,Q,W,Y)=>{let U,G,Z=0;if(J.level>0){if(J.strm.data_type===2)J.strm.data_type=nW(J);if(W0(J,J.l_desc),W0(J,J.d_desc),Z=dW(J),U=J.opt_len+3+7>>>3,G=J.static_len+3+7>>>3,G<=U)U=G}else U=G=W+5;if(W+4<=U&&Q!==-1)E9(J,Q,W,Y);else if(J.strategy===4||G===U)HJ(J,($9<<1)+(Y?1:0),3),N7(J,fJ,t5);else HJ(J,(fW<<1)+(Y?1:0),3),lW(J,J.l_desc.max_code+1,J.d_desc.max_code+1,Z+1),N7(J,J.dyn_ltree,J.dyn_dtree);if(A9(J),Y)T9(J)},aW=(J,Q,W)=>{if(J.pending_buf[J.sym_buf+J.sym_next++]=Q,J.pending_buf[J.sym_buf+J.sym_next++]=Q>>8,J.pending_buf[J.sym_buf+J.sym_next++]=W,Q===0)J.dyn_ltree[W*2]++;else J.matches++,Q--,J.dyn_ltree[(Y6[W]+K6+1)*2]++,J.dyn_dtree[O9(Q)*2]++;return J.sym_next===J.sym_end},sW=iW,tW=E9,eW=rW,J4=aW,Q4=oW,W4={_tr_init:sW,_tr_stored_block:tW,_tr_flush_block:eW,_tr_tally:J4,_tr_align:Q4},Y4=(J,Q,W,Y)=>{let U=J&65535|0,G=J>>>16&65535|0,Z=0;while(W!==0){Z=W>2000?2000:W,W-=Z;do U=U+Q[Y++]|0,G=G+U|0;while(--Z);U%=65521,G%=65521}return U|G<<16|0},U6=Y4,G4=()=>{let J,Q=[];for(var W=0;W<256;W++){J=W;for(var Y=0;Y<8;Y++)J=J&1?3988292384^J>>>1:J>>>1;Q[W]=J}return Q},U4=new Uint32Array(G4()),z4=(J,Q,W,Y)=>{let U=U4,G=Y+W;J^=-1;for(let Z=Y;Z<G;Z++)J=J>>>8^U[(J^Q[Z])&255];return J^-1},e=z4,G5={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},K5={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8},{_tr_init:Z4,_tr_stored_block:Y0,_tr_flush_block:K4,_tr_tally:pJ,_tr_align:F4}=W4,{Z_NO_FLUSH:dJ,Z_PARTIAL_FLUSH:X4,Z_FULL_FLUSH:$4,Z_FINISH:OJ,Z_BLOCK:I7,Z_OK:QJ,Z_STREAM_END:w7,Z_STREAM_ERROR:SJ,Z_DATA_ERROR:H4,Z_BUF_ERROR:l8,Z_DEFAULT_COMPRESSION:V4,Z_FILTERED:q4,Z_HUFFMAN_ONLY:v6,Z_RLE:L4,Z_FIXED:B4,Z_DEFAULT_STRATEGY:j4,Z_UNKNOWN:M4,Z_DEFLATED:l6}=K5,P4=9,O4=15,C4=8,R4=29,A4=256,G0=A4+1+R4,T4=30,E4=19,N4=2*G0+1,D4=15,h=3,cJ=258,IJ=cJ+h+1,k4=32,E5=42,q0=57,U0=69,z0=73,Z0=91,K0=103,W5=113,a5=666,zJ=1,k5=2,U5=3,S5=4,S4=3,Y5=(J,Q)=>{return J.msg=G5[Q],Q},y7=(J)=>{return J*2-(J>4?9:0)},mJ=(J)=>{let Q=J.length;while(--Q>=0)J[Q]=0},I4=(J)=>{let Q,W,Y,U=J.w_size;Q=J.hash_size,Y=Q;do W=J.head[--Y],J.head[Y]=W>=U?W-U:0;while(--Q);Q=U,Y=Q;do W=J.prev[--Y],J.prev[Y]=W>=U?W-U:0;while(--Q)},L0=(J,Q,W)=>(Q<<J.hash_shift^W)&J.hash_mask,z5=(J,Q)=>{let W;if(J.legacy_hash)W=J.ins_h=L0(J,J.ins_h,J.window[Q+h-1]);else{let U=J.window,G=U[Q]|U[Q+1]<<8|U[Q+2]<<16|U[Q+3]<<24;W=J.ins_h=Math.imul(G,66521)+66521>>>16&J.hash_mask}let Y=J.prev[Q&J.w_mask]=J.head[W];return J.head[W]=Q,Y},LJ=(J)=>{let Q=J.state,W=Q.pending;if(W>J.avail_out)W=J.avail_out;if(W===0)return;if(J.output.set(Q.pending_buf.subarray(Q.pending_out,Q.pending_out+W),J.next_out),J.next_out+=W,Q.pending_out+=W,J.total_out+=W,J.avail_out-=W,Q.pending-=W,Q.pending===0)Q.pending_out=0},BJ=(J,Q)=>{K4(J,J.block_start>=0?J.block_start:-1,J.strstart-J.block_start,Q),J.block_start=J.strstart,LJ(J.strm)},g=(J,Q)=>{J.pending_buf[J.pending++]=Q},r5=(J,Q)=>{J.pending_buf[J.pending++]=Q>>>8&255,J.pending_buf[J.pending++]=Q&255},F0=(J,Q,W,Y)=>{let U=J.avail_in;if(U>Y)U=Y;if(U===0)return 0;if(J.avail_in-=U,Q.set(J.input.subarray(J.next_in,J.next_in+U),W),J.state.wrap===1)J.adler=U6(J.adler,Q,U,W);else if(J.state.wrap===2)J.adler=e(J.adler,Q,U,W);return J.next_in+=U,J.total_in+=U,U},N9=(J,Q)=>{let{max_chain_length:W,strstart:Y}=J,U,G,Z=J.prev_length,K=J.nice_match,$=J.strstart>J.w_size-IJ?J.strstart-(J.w_size-IJ):0,z=J.window,F=J.w_mask,X=J.prev,H=J.strstart+cJ,V=z[Y+Z-1],q=z[Y+Z];if(J.prev_length>=J.good_match)W>>=2;if(K>J.lookahead)K=J.lookahead;do{if(U=Q,z[U+Z]!==q||z[U+Z-1]!==V||z[U]!==z[Y]||z[++U]!==z[Y+1])continue;Y+=2,U++;do;while(z[++Y]===z[++U]&&z[++Y]===z[++U]&&z[++Y]===z[++U]&&z[++Y]===z[++U]&&z[++Y]===z[++U]&&z[++Y]===z[++U]&&z[++Y]===z[++U]&&z[++Y]===z[++U]&&Y<H);if(G=cJ-(H-Y),Y=H-cJ,G>Z){if(J.match_start=Q,Z=G,G>=K)break;V=z[Y+Z-1],q=z[Y+Z]}}while((Q=X[Q&F])>$&&--W!==0);if(Z<=J.lookahead)return Z;return J.lookahead},N5=(J)=>{let Q=J.w_size,W,Y,U;do{if(Y=J.window_size-J.lookahead-J.strstart,J.strstart>=Q+(Q-IJ)){if(J.window.set(J.window.subarray(Q,Q+Q-Y),0),J.match_start-=Q,J.strstart-=Q,J.block_start-=Q,J.insert>J.strstart)J.insert=J.strstart;I4(J),Y+=Q}if(J.strm.avail_in===0)break;if(W=F0(J.strm,J.window,J.strstart+J.lookahead,Y),J.lookahead+=W,!J.legacy_hash){if(J.lookahead+J.insert>h){U=J.strstart-J.insert;while(J.insert)if(z5(J,U),U++,J.insert--,J.lookahead+J.insert<=h)break}}else if(J.lookahead+J.insert>=h){U=J.strstart-J.insert,J.ins_h=J.window[U],J.ins_h=L0(J,J.ins_h,J.window[U+1]);while(J.insert)if(z5(J,U),U++,J.insert--,J.lookahead+J.insert<h)break}}while(J.lookahead<IJ&&J.strm.avail_in!==0)},D9=(J,Q)=>{let W=J.pending_buf_size-5>J.w_size?J.w_size:J.pending_buf_size-5,Y,U,G,Z=0,K=J.strm.avail_in;do{if(Y=65535,G=J.bi_valid+42>>3,J.strm.avail_out<G)break;if(G=J.strm.avail_out-G,U=J.strstart-J.block_start,Y>U+J.strm.avail_in)Y=U+J.strm.avail_in;if(Y>G)Y=G;if(Y<W&&(Y===0&&Q!==OJ||Q===dJ||Y!==U+J.strm.avail_in))break;if(Z=Q===OJ&&Y===U+J.strm.avail_in?1:0,Y0(J,0,0,Z),J.pending_buf[J.pending-4]=Y,J.pending_buf[J.pending-3]=Y>>8,J.pending_buf[J.pending-2]=~Y,J.pending_buf[J.pending-1]=~Y>>8,LJ(J.strm),U){if(U>Y)U=Y;J.strm.output.set(J.window.subarray(J.block_start,J.block_start+U),J.strm.next_out),J.strm.next_out+=U,J.strm.avail_out-=U,J.strm.total_out+=U,J.block_start+=U,Y-=U}if(Y)F0(J.strm,J.strm.output,J.strm.next_out,Y),J.strm.next_out+=Y,J.strm.avail_out-=Y,J.strm.total_out+=Y}while(Z===0);if(K-=J.strm.avail_in,K){if(K>=J.w_size)J.matches=2,J.window.set(J.strm.input.subarray(J.strm.next_in-J.w_size,J.strm.next_in),0),J.strstart=J.w_size,J.insert=J.strstart;else{if(J.window_size-J.strstart<=K){if(J.strstart-=J.w_size,J.window.set(J.window.subarray(J.w_size,J.w_size+J.strstart),0),J.matches<2)J.matches++;if(J.insert>J.strstart)J.insert=J.strstart}J.window.set(J.strm.input.subarray(J.strm.next_in-K,J.strm.next_in),J.strstart),J.strstart+=K,J.insert+=K>J.w_size-J.insert?J.w_size-J.insert:K}J.block_start=J.strstart}if(J.high_water<J.strstart)J.high_water=J.strstart;if(Z)return S5;if(Q!==dJ&&Q!==OJ&&J.strm.avail_in===0&&J.strstart===J.block_start)return k5;if(G=J.window_size-J.strstart,J.strm.avail_in>G&&J.block_start>=J.w_size){if(J.block_start-=J.w_size,J.strstart-=J.w_size,J.window.set(J.window.subarray(J.w_size,J.w_size+J.strstart),0),J.matches<2)J.matches++;if(G+=J.w_size,J.insert>J.strstart)J.insert=J.strstart}if(G>J.strm.avail_in)G=J.strm.avail_in;if(G)F0(J.strm,J.window,J.strstart,G),J.strstart+=G,J.insert+=G>J.w_size-J.insert?J.w_size-J.insert:G;if(J.high_water<J.strstart)J.high_water=J.strstart;if(G=J.bi_valid+42>>3,G=J.pending_buf_size-G>65535?65535:J.pending_buf_size-G,W=G>J.w_size?J.w_size:G,U=J.strstart-J.block_start,U>=W||(U||Q===OJ)&&Q!==dJ&&J.strm.avail_in===0&&U<=G)Y=U>G?G:U,Z=Q===OJ&&J.strm.avail_in===0&&Y===U?1:0,Y0(J,J.block_start,Y,Z),J.block_start+=Y,LJ(J.strm);return Z?U5:zJ},n8=(J,Q)=>{let W,Y;for(;;){if(J.lookahead<IJ){if(N5(J),J.lookahead<IJ&&Q===dJ)return zJ;if(J.lookahead===0)break}if(W=0,J.lookahead>=h)W=z5(J,J.strstart);if(W!==0&&J.strstart-W<=J.w_size-IJ)J.match_length=N9(J,W);if(J.match_length>=h){if(Y=pJ(J,J.strstart-J.match_start,J.match_length-h),J.lookahead-=J.match_length,J.match_length<=J.max_lazy_match&&J.lookahead>=h){J.match_length--;do J.strstart++,W=z5(J,J.strstart);while(--J.match_length!==0);J.strstart++}else if(J.strstart+=J.match_length,J.match_length=0,J.legacy_hash)J.ins_h=J.window[J.strstart],J.ins_h=L0(J,J.ins_h,J.window[J.strstart+1])}else Y=pJ(J,0,J.window[J.strstart]),J.lookahead--,J.strstart++;if(Y){if(BJ(J,!1),J.strm.avail_out===0)return zJ}}if(J.insert=J.strstart<h-1?J.strstart:h-1,Q===OJ){if(BJ(J,!0),J.strm.avail_out===0)return U5;return S5}if(J.sym_next){if(BJ(J,!1),J.strm.avail_out===0)return zJ}return k5},C5=(J,Q)=>{let W,Y,U;for(;;){if(J.lookahead<IJ){if(N5(J),J.lookahead<IJ&&Q===dJ)return zJ;if(J.lookahead===0)break}if(W=0,J.lookahead>=h)W=z5(J,J.strstart);if(J.prev_length=J.match_length,J.prev_match=J.match_start,J.match_length=h-1,W!==0&&J.prev_length<J.max_lazy_match&&J.strstart-W<=J.w_size-IJ){if(J.match_length=N9(J,W),J.match_length<=5&&(J.strategy===q4||J.match_length===h&&J.strstart-J.match_start>4096))J.match_length=h-1}if(J.prev_length>=h&&J.match_length<=J.prev_length){U=J.strstart+J.lookahead-h,Y=pJ(J,J.strstart-1-J.prev_match,J.prev_length-h),J.lookahead-=J.prev_length-1,J.prev_length-=2;do if(++J.strstart<=U)W=z5(J,J.strstart);while(--J.prev_length!==0);if(J.match_available=0,J.match_length=h-1,J.strstart++,Y){if(BJ(J,!1),J.strm.avail_out===0)return zJ}}else if(J.match_available){if(Y=pJ(J,0,J.window[J.strstart-1]),Y)BJ(J,!1);if(J.strstart++,J.lookahead--,J.strm.avail_out===0)return zJ}else J.match_available=1,J.strstart++,J.lookahead--}if(J.match_available)Y=pJ(J,0,J.window[J.strstart-1]),J.match_available=0;if(J.insert=J.strstart<h-1?J.strstart:h-1,Q===OJ){if(BJ(J,!0),J.strm.avail_out===0)return U5;return S5}if(J.sym_next){if(BJ(J,!1),J.strm.avail_out===0)return zJ}return k5},w4=(J,Q)=>{let W,Y,U,G,Z=J.window;for(;;){if(J.lookahead<=cJ){if(N5(J),J.lookahead<=cJ&&Q===dJ)return zJ;if(J.lookahead===0)break}if(J.match_length=0,J.lookahead>=h&&J.strstart>0){if(U=J.strstart-1,Y=Z[U],Y===Z[++U]&&Y===Z[++U]&&Y===Z[++U]){G=J.strstart+cJ;do;while(Y===Z[++U]&&Y===Z[++U]&&Y===Z[++U]&&Y===Z[++U]&&Y===Z[++U]&&Y===Z[++U]&&Y===Z[++U]&&Y===Z[++U]&&U<G);if(J.match_length=cJ-(G-U),J.match_length>J.lookahead)J.match_length=J.lookahead}}if(J.match_length>=h)W=pJ(J,1,J.match_length-h),J.lookahead-=J.match_length,J.strstart+=J.match_length,J.match_length=0;else W=pJ(J,0,J.window[J.strstart]),J.lookahead--,J.strstart++;if(W){if(BJ(J,!1),J.strm.avail_out===0)return zJ}}if(J.insert=0,Q===OJ){if(BJ(J,!0),J.strm.avail_out===0)return U5;return S5}if(J.sym_next){if(BJ(J,!1),J.strm.avail_out===0)return zJ}return k5},y4=(J,Q)=>{let W;for(;;){if(J.lookahead===0){if(N5(J),J.lookahead===0){if(Q===dJ)return zJ;break}}if(J.match_length=0,W=pJ(J,0,J.window[J.strstart]),J.lookahead--,J.strstart++,W){if(BJ(J,!1),J.strm.avail_out===0)return zJ}}if(J.insert=0,Q===OJ){if(BJ(J,!0),J.strm.avail_out===0)return U5;return S5}if(J.sym_next){if(BJ(J,!1),J.strm.avail_out===0)return zJ}return k5};function NJ(J,Q,W,Y,U){this.good_length=J,this.max_lazy=Q,this.nice_length=W,this.max_chain=Y,this.func=U}var s5=[new NJ(0,0,0,0,D9),new NJ(4,4,8,4,n8),new NJ(4,5,16,8,n8),new NJ(4,6,32,32,n8),new NJ(4,4,16,16,C5),new NJ(8,16,32,32,C5),new NJ(8,16,128,128,C5),new NJ(8,32,128,256,C5),new NJ(32,128,258,1024,C5),new NJ(32,258,258,4096,C5)],b4=(J)=>{J.window_size=2*J.w_size,mJ(J.head),J.max_lazy_match=s5[J.level].max_lazy,J.good_match=s5[J.level].good_length,J.nice_match=s5[J.level].nice_length,J.max_chain_length=s5[J.level].max_chain,J.strstart=0,J.block_start=0,J.lookahead=0,J.insert=0,J.match_length=J.prev_length=h-1,J.match_available=0,J.ins_h=0};function _4(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=l6,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.legacy_hash=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new Uint16Array(N4*2),this.dyn_dtree=new Uint16Array((2*T4+1)*2),this.bl_tree=new Uint16Array((2*E4+1)*2),mJ(this.dyn_ltree),mJ(this.dyn_dtree),mJ(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new Uint16Array(D4+1),this.heap=new Uint16Array(2*G0+1),mJ(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new Uint16Array(2*G0+1),mJ(this.depth),this.sym_buf=0,this.lit_bufsize=0,this.sym_next=0,this.sym_end=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}var F6=(J)=>{if(!J)return 1;let Q=J.state;if(!Q||Q.strm!==J||Q.status!==E5&&Q.status!==q0&&Q.status!==U0&&Q.status!==z0&&Q.status!==Z0&&Q.status!==K0&&Q.status!==W5&&Q.status!==a5)return 1;return 0},k9=(J)=>{if(F6(J))return Y5(J,SJ);J.total_in=J.total_out=0,J.data_type=M4;let Q=J.state;if(Q.pending=0,Q.pending_out=0,Q.wrap<0)Q.wrap=-Q.wrap;return Q.status=Q.wrap===2?q0:Q.wrap?E5:W5,J.adler=Q.wrap===2?0:1,Q.last_flush=-2,Z4(Q),QJ},S9=(J)=>{let Q=k9(J);if(Q===QJ)b4(J.state);return Q},f4=(J,Q)=>{if(F6(J)||J.state.wrap!==2)return SJ;return J.state.gzhead=Q,QJ},I9=(J,Q,W,Y,U,G,Z)=>{if(!J)return SJ;let K=1;if(Q===V4)Q=6;if(Y<0)K=0,Y=-Y;else if(Y>15)K=2,Y-=16;if(U<1||U>P4||W!==l6||Y<8||Y>15||Q<0||Q>9||G<0||G>B4||Y===8&&K!==1)return Y5(J,SJ);if(Y===8)Y=9;let $=new _4;if(J.state=$,$.strm=J,$.status=E5,$.wrap=K,$.gzhead=null,$.w_bits=Y,$.w_size=1<<$.w_bits,$.w_mask=$.w_size-1,$.legacy_hash=Z?1:0,$.hash_bits=U+7,!$.legacy_hash&&$.hash_bits<15)$.hash_bits=15;return $.hash_size=1<<$.hash_bits,$.hash_mask=$.hash_size-1,$.hash_shift=~~(($.hash_bits+h-1)/h),$.window=new Uint8Array($.w_size*2),$.head=new Uint16Array($.hash_size),$.prev=new Uint16Array($.w_size),$.lit_bufsize=1<<U+6,$.pending_buf_size=$.lit_bufsize*4,$.pending_buf=new Uint8Array($.pending_buf_size),$.sym_buf=$.lit_bufsize,$.sym_end=($.lit_bufsize-1)*3,$.level=Q,$.strategy=G,$.method=W,S9(J)},v4=(J,Q)=>{return I9(J,Q,l6,O4,C4,j4)},x4=(J,Q)=>{if(F6(J)||Q>I7||Q<0)return J?Y5(J,SJ):SJ;let W=J.state;if(!J.output||J.avail_in!==0&&!J.input||W.status===a5&&Q!==OJ)return Y5(J,J.avail_out===0?l8:SJ);let Y=W.last_flush;if(W.last_flush=Q,W.pending!==0){if(LJ(J),J.avail_out===0)return W.last_flush=-1,QJ}else if(J.avail_in===0&&y7(Q)<=y7(Y)&&Q!==OJ)return Y5(J,l8);if(W.status===a5&&J.avail_in!==0)return Y5(J,l8);if(W.status===E5&&W.wrap===0)W.status=W5;if(W.status===E5){let U=l6+(W.w_bits-8<<4)<<8,G=-1;if(W.strategy>=v6||W.level<2)G=0;else if(W.level<6)G=1;else if(W.level===6)G=2;else G=3;if(U|=G<<6,W.strstart!==0)U|=k4;if(U+=31-U%31,r5(W,U),W.strstart!==0)r5(W,J.adler>>>16),r5(W,J.adler&65535);if(J.adler=1,W.status=W5,LJ(J),W.pending!==0)return W.last_flush=-1,QJ}if(W.status===q0)if(J.adler=0,g(W,31),g(W,139),g(W,8),!W.gzhead){if(g(W,0),g(W,0),g(W,0),g(W,0),g(W,0),g(W,W.level===9?2:W.strategy>=v6||W.level<2?4:0),g(W,S4),W.status=W5,LJ(J),W.pending!==0)return W.last_flush=-1,QJ}else{if(g(W,(W.gzhead.text?1:0)+(W.gzhead.hcrc?2:0)+(!W.gzhead.extra?0:4)+(!W.gzhead.name?0:8)+(!W.gzhead.comment?0:16)),g(W,W.gzhead.time&255),g(W,W.gzhead.time>>8&255),g(W,W.gzhead.time>>16&255),g(W,W.gzhead.time>>24&255),g(W,W.level===9?2:W.strategy>=v6||W.level<2?4:0),g(W,W.gzhead.os&255),W.gzhead.extra&&W.gzhead.extra.length)g(W,W.gzhead.extra.length&255),g(W,W.gzhead.extra.length>>8&255);if(W.gzhead.hcrc)J.adler=e(J.adler,W.pending_buf,W.pending,0);W.gzindex=0,W.status=U0}if(W.status===U0){if(W.gzhead.extra){let U=W.pending,G=(W.gzhead.extra.length&65535)-W.gzindex;while(W.pending+G>W.pending_buf_size){let K=W.pending_buf_size-W.pending;if(W.pending_buf.set(W.gzhead.extra.subarray(W.gzindex,W.gzindex+K),W.pending),W.pending=W.pending_buf_size,W.gzhead.hcrc&&W.pending>U)J.adler=e(J.adler,W.pending_buf,W.pending-U,U);if(W.gzindex+=K,LJ(J),W.pending!==0)return W.last_flush=-1,QJ;U=0,G-=K}let Z=new Uint8Array(W.gzhead.extra);if(W.pending_buf.set(Z.subarray(W.gzindex,W.gzindex+G),W.pending),W.pending+=G,W.gzhead.hcrc&&W.pending>U)J.adler=e(J.adler,W.pending_buf,W.pending-U,U);W.gzindex=0}W.status=z0}if(W.status===z0){if(W.gzhead.name){let U=W.pending,G;do{if(W.pending===W.pending_buf_size){if(W.gzhead.hcrc&&W.pending>U)J.adler=e(J.adler,W.pending_buf,W.pending-U,U);if(LJ(J),W.pending!==0)return W.last_flush=-1,QJ;U=0}if(W.gzindex<W.gzhead.name.length)G=W.gzhead.name.charCodeAt(W.gzindex++)&255;else G=0;g(W,G)}while(G!==0);if(W.gzhead.hcrc&&W.pending>U)J.adler=e(J.adler,W.pending_buf,W.pending-U,U);W.gzindex=0}W.status=Z0}if(W.status===Z0){if(W.gzhead.comment){let U=W.pending,G;do{if(W.pending===W.pending_buf_size){if(W.gzhead.hcrc&&W.pending>U)J.adler=e(J.adler,W.pending_buf,W.pending-U,U);if(LJ(J),W.pending!==0)return W.last_flush=-1,QJ;U=0}if(W.gzindex<W.gzhead.comment.length)G=W.gzhead.comment.charCodeAt(W.gzindex++)&255;else G=0;g(W,G)}while(G!==0);if(W.gzhead.hcrc&&W.pending>U)J.adler=e(J.adler,W.pending_buf,W.pending-U,U)}W.status=K0}if(W.status===K0){if(W.gzhead.hcrc){if(W.pending+2>W.pending_buf_size){if(LJ(J),W.pending!==0)return W.last_flush=-1,QJ}g(W,J.adler&255),g(W,J.adler>>8&255),J.adler=0}if(W.status=W5,LJ(J),W.pending!==0)return W.last_flush=-1,QJ}if(J.avail_in!==0||W.lookahead!==0||Q!==dJ&&W.status!==a5){let U=W.level===0?D9(W,Q):W.strategy===v6?y4(W,Q):W.strategy===L4?w4(W,Q):s5[W.level].func(W,Q);if(U===U5||U===S5)W.status=a5;if(U===zJ||U===U5){if(J.avail_out===0)W.last_flush=-1;return QJ}if(U===k5){if(Q===X4)F4(W);else if(Q!==I7){if(Y0(W,0,0,!1),Q===$4){if(mJ(W.head),W.lookahead===0)W.strstart=0,W.block_start=0,W.insert=0}}if(LJ(J),J.avail_out===0)return W.last_flush=-1,QJ}}if(Q!==OJ)return QJ;if(W.wrap<=0)return w7;if(W.wrap===2)g(W,J.adler&255),g(W,J.adler>>8&255),g(W,J.adler>>16&255),g(W,J.adler>>24&255),g(W,J.total_in&255),g(W,J.total_in>>8&255),g(W,J.total_in>>16&255),g(W,J.total_in>>24&255);else r5(W,J.adler>>>16),r5(W,J.adler&65535);if(LJ(J),W.wrap>0)W.wrap=-W.wrap;return W.pending!==0?QJ:w7},h4=(J)=>{if(F6(J))return SJ;let Q=J.state.status;return J.state=null,Q===W5?Y5(J,H4):QJ},u4=(J,Q)=>{let W=Q.length;if(F6(J))return SJ;let Y=J.state,U=Y.wrap;if(U===2||U===1&&Y.status!==E5||Y.lookahead)return SJ;if(U===1)J.adler=U6(J.adler,Q,W,0);if(Y.wrap=0,W>=Y.w_size){if(U===0)mJ(Y.head),Y.strstart=0,Y.block_start=0,Y.insert=0;let $=new Uint8Array(Y.w_size);$.set(Q.subarray(W-Y.w_size,W),0),Q=$,W=Y.w_size}let{avail_in:G,next_in:Z,input:K}=J;J.avail_in=W,J.next_in=0,J.input=Q,N5(Y);while(Y.lookahead>=h){let $=Y.strstart,z=Y.lookahead-(h-1);do z5(Y,$),$++;while(--z);Y.strstart=$,Y.lookahead=h-1,N5(Y)}return Y.strstart+=Y.lookahead,Y.block_start=Y.strstart,Y.insert=Y.lookahead,Y.lookahead=0,Y.match_length=Y.prev_length=h-1,Y.match_available=0,J.next_in=Z,J.input=K,J.avail_in=G,Y.wrap=U,QJ},g4=v4,m4=I9,c4=S9,p4=k9,d4=f4,l4=x4,n4=h4,i4=u4,o4="pako deflate (from Nodeca project)",e5={deflateInit:g4,deflateInit2:m4,deflateReset:c4,deflateResetKeep:p4,deflateSetHeader:d4,deflate:l4,deflateEnd:n4,deflateSetDictionary:i4,deflateInfo:o4},r4=(J,Q)=>{return Object.prototype.hasOwnProperty.call(J,Q)},a4=function(J){let Q=Array.prototype.slice.call(arguments,1);while(Q.length){let W=Q.shift();if(!W)continue;if(typeof W!=="object")throw TypeError(W+"must be non-object");for(let Y in W)if(r4(W,Y))J[Y]=W[Y]}return J},s4=(J)=>{let Q=0;for(let Y=0,U=J.length;Y<U;Y++)Q+=J[Y].length;let W=new Uint8Array(Q);for(let Y=0,U=0,G=J.length;Y<G;Y++){let Z=J[Y];W.set(Z,U),U+=Z.length}return W},n6={assign:a4,flattenChunks:s4},w9=!0;try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(J){w9=!1}var z6=new Uint8Array(256);for(let J=0;J<256;J++)z6[J]=J>=252?6:J>=248?5:J>=240?4:J>=224?3:J>=192?2:1;z6[254]=z6[255]=1;var t4=(J)=>{if(typeof TextEncoder==="function"&&TextEncoder.prototype.encode)return new TextEncoder().encode(J);let Q,W,Y,U,G,Z=J.length,K=0;for(U=0;U<Z;U++){if(W=J.charCodeAt(U),(W&64512)===55296&&U+1<Z){if(Y=J.charCodeAt(U+1),(Y&64512)===56320)W=65536+(W-55296<<10)+(Y-56320),U++}K+=W<128?1:W<2048?2:W<65536?3:4}Q=new Uint8Array(K);for(G=0,U=0;G<K;U++){if(W=J.charCodeAt(U),(W&64512)===55296&&U+1<Z){if(Y=J.charCodeAt(U+1),(Y&64512)===56320)W=65536+(W-55296<<10)+(Y-56320),U++}if(W<128)Q[G++]=W;else if(W<2048)Q[G++]=192|W>>>6,Q[G++]=128|W&63;else if(W<65536)Q[G++]=224|W>>>12,Q[G++]=128|W>>>6&63,Q[G++]=128|W&63;else Q[G++]=240|W>>>18,Q[G++]=128|W>>>12&63,Q[G++]=128|W>>>6&63,Q[G++]=128|W&63}return Q},e4=(J,Q)=>{if(Q<65534){if(J.subarray&&w9)return String.fromCharCode.apply(null,J.length===Q?J:J.subarray(0,Q))}let W="";for(let Y=0;Y<Q;Y++)W+=String.fromCharCode(J[Y]);return W},JY=(J,Q)=>{let W=Q||J.length;if(typeof TextDecoder==="function"&&TextDecoder.prototype.decode)return new TextDecoder().decode(J.subarray(0,Q));let Y,U,G=Array(W*2);for(U=0,Y=0;Y<W;){let Z=J[Y++];if(Z<128){G[U++]=Z;continue}let K=z6[Z];if(K>4){G[U++]=65533,Y+=K-1;continue}Z&=K===2?31:K===3?15:7;while(K>1&&Y<W)Z=Z<<6|J[Y++]&63,K--;if(K>1){G[U++]=65533;continue}if(Z<65536)G[U++]=Z;else Z-=65536,G[U++]=55296|Z>>10&1023,G[U++]=56320|Z&1023}return e4(G,U)},QY=(J,Q)=>{if(Q=Q||J.length,Q>J.length)Q=J.length;let W=Q-1;while(W>=0&&(J[W]&192)===128)W--;if(W<0)return Q;if(W===0)return Q;return W+z6[J[W]]>Q?W:Q},Z6={string2buf:t4,buf2string:JY,utf8border:QY};function WY(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}var y9=WY,b9=Object.prototype.toString,{Z_NO_FLUSH:YY,Z_SYNC_FLUSH:GY,Z_FULL_FLUSH:UY,Z_FINISH:zY,Z_OK:p6,Z_STREAM_END:ZY,Z_DEFAULT_COMPRESSION:KY,Z_DEFAULT_STRATEGY:FY,Z_DEFLATED:XY}=K5,$Y={level:KY,method:XY,chunkSize:16384,windowBits:15,memLevel:8,strategy:FY,legacyHash:!0};function X6(J){this.options=n6.assign({},$Y,J||{});let Q=this.options;if(Q.raw&&Q.windowBits>0)Q.windowBits=-Q.windowBits;else if(Q.gzip&&Q.windowBits>0&&Q.windowBits<16)Q.windowBits+=16;this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new y9,this.strm.avail_out=0;let W=e5.deflateInit2(this.strm,Q.level,Q.method,Q.windowBits,Q.memLevel,Q.strategy,Q.legacyHash);if(W!==p6)throw Error(G5[W]);if(Q.header)e5.deflateSetHeader(this.strm,Q.header);if(Q.dictionary){let Y;if(typeof Q.dictionary==="string")Y=Z6.string2buf(Q.dictionary);else if(b9.call(Q.dictionary)==="[object ArrayBuffer]")Y=new Uint8Array(Q.dictionary);else Y=Q.dictionary;if(W=e5.deflateSetDictionary(this.strm,Y),W!==p6)throw Error(G5[W]);this._dict_set=!0}}X6.prototype.push=function(J,Q){let W=this.strm,Y=this.options.chunkSize,U,G;if(this.ended)return!1;if(Q===~~Q)G=Q;else G=Q===!0?zY:YY;if(typeof J==="string")W.input=Z6.string2buf(J);else if(b9.call(J)==="[object ArrayBuffer]")W.input=new Uint8Array(J);else W.input=J;W.next_in=0,W.avail_in=W.input.length;for(;;){if(W.avail_out===0)W.output=new Uint8Array(Y),W.next_out=0,W.avail_out=Y;if((G===GY||G===UY)&&W.avail_out<=6){this.onData(W.output.subarray(0,W.next_out)),W.avail_out=0;continue}if(U=e5.deflate(W,G),U===ZY){if(W.next_out>0)this.onData(W.output.subarray(0,W.next_out));return U=e5.deflateEnd(this.strm),this.onEnd(U),this.ended=!0,U===p6}if(W.avail_out===0){this.onData(W.output);continue}if(G>0&&W.next_out>0){this.onData(W.output.subarray(0,W.next_out)),W.avail_out=0;continue}if(W.avail_in===0)break}return!0};X6.prototype.onData=function(J){this.chunks.push(J)};X6.prototype.onEnd=function(J){if(J===p6)this.result=n6.flattenChunks(this.chunks);this.chunks=[],this.err=J,this.msg=this.strm.msg};function B0(J,Q){let W=new X6(Q);if(W.push(J,!0),W.err)throw W.msg||G5[W.err];return W.result}function HY(J,Q){return Q=Q||{},Q.raw=!0,B0(J,Q)}function VY(J,Q){return Q=Q||{},Q.gzip=!0,B0(J,Q)}var qY=X6,LY=B0,BY=HY,jY=VY,MY=K5,PY={Deflate:qY,deflate:LY,deflateRaw:BY,gzip:jY,constants:MY},x6=16209,OY=16191,CY=function(Q,W){let Y,U,G,Z,K,$,z,F,X,H,V,q,L,M,B,j,O,P,R,T,A,D,N,C,k=Q.state;Y=Q.next_in,N=Q.input,U=Y+(Q.avail_in-5),G=Q.next_out,C=Q.output,Z=G-(W-Q.avail_out),K=G+(Q.avail_out-257),$=k.dmax,z=k.wsize,F=k.whave,X=k.wnext,H=k.window,V=k.hold,q=k.bits,L=k.lencode,M=k.distcode,B=(1<<k.lenbits)-1,j=(1<<k.distbits)-1;J:do{if(q<15)V+=N[Y++]<<q,q+=8,V+=N[Y++]<<q,q+=8;O=L[V&B];Q:for(;;){if(P=O>>>24,V>>>=P,q-=P,P=O>>>16&255,P===0)C[G++]=O&65535;else if(P&16){if(R=O&65535,P&=15,P){if(q<P)V+=N[Y++]<<q,q+=8;R+=V&(1<<P)-1,V>>>=P,q-=P}if(q<15)V+=N[Y++]<<q,q+=8,V+=N[Y++]<<q,q+=8;O=M[V&j];W:for(;;){if(P=O>>>24,V>>>=P,q-=P,P=O>>>16&255,P&16){if(T=O&65535,P&=15,q<P){if(V+=N[Y++]<<q,q+=8,q<P)V+=N[Y++]<<q,q+=8}if(T+=V&(1<<P)-1,T>$){Q.msg="invalid distance too far back",k.mode=x6;break J}if(V>>>=P,q-=P,P=G-Z,T>P){if(P=T-P,P>F){if(k.sane){Q.msg="invalid distance too far back",k.mode=x6;break J}}if(A=0,D=H,X===0){if(A+=z-P,P<R){R-=P;do C[G++]=H[A++];while(--P);A=G-T,D=C}}else if(X<P){if(A+=z+X-P,P-=X,P<R){R-=P;do C[G++]=H[A++];while(--P);if(A=0,X<R){P=X,R-=P;do C[G++]=H[A++];while(--P);A=G-T,D=C}}}else if(A+=X-P,P<R){R-=P;do C[G++]=H[A++];while(--P);A=G-T,D=C}while(R>2)C[G++]=D[A++],C[G++]=D[A++],C[G++]=D[A++],R-=3;if(R){if(C[G++]=D[A++],R>1)C[G++]=D[A++]}}else{A=G-T;do C[G++]=C[A++],C[G++]=C[A++],C[G++]=C[A++],R-=3;while(R>2);if(R){if(C[G++]=C[A++],R>1)C[G++]=C[A++]}}}else if((P&64)===0){O=M[(O&65535)+(V&(1<<P)-1)];continue W}else{Q.msg="invalid distance code",k.mode=x6;break J}break}}else if((P&64)===0){O=L[(O&65535)+(V&(1<<P)-1)];continue Q}else if(P&32){k.mode=OY;break J}else{Q.msg="invalid literal/length code",k.mode=x6;break J}break}}while(Y<U&&G<K);R=q>>3,Y-=R,q-=R<<3,V&=(1<<q)-1,Q.next_in=Y,Q.next_out=G,Q.avail_in=Y<U?5+(U-Y):5-(Y-U),Q.avail_out=G<K?257+(K-G):257-(G-K),k.hold=V,k.bits=q;return},R5=15,b7=852,_7=592,f7=0,i8=1,v7=2,RY=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),AY=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,199,75]),TY=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),EY=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]),NY=(J,Q,W,Y,U,G,Z,K)=>{let $=K.bits,z=0,F=0,X=0,H=0,V=0,q=0,L=0,M=0,B=0,j=0,O,P,R,T,A,D=null,N,C=new Uint16Array(R5+1),k=new Uint16Array(R5+1),S=null,x,b,t;for(z=0;z<=R5;z++)C[z]=0;for(F=0;F<Y;F++)C[Q[W+F]]++;V=$;for(H=R5;H>=1;H--)if(C[H]!==0)break;if(V>H)V=H;if(H===0)return U[G++]=20971520,U[G++]=20971520,K.bits=1,0;for(X=1;X<H;X++)if(C[X]!==0)break;if(V<X)V=X;M=1;for(z=1;z<=R5;z++)if(M<<=1,M-=C[z],M<0)return-1;if(M>0&&(J===f7||H!==1))return-1;k[1]=0;for(z=1;z<R5;z++)k[z+1]=k[z]+C[z];for(F=0;F<Y;F++)if(Q[W+F]!==0)Z[k[Q[W+F]]++]=F;if(J===f7)D=S=Z,N=20;else if(J===i8)D=RY,S=AY,N=257;else D=TY,S=EY,N=0;if(j=0,F=0,z=X,A=G,q=V,L=0,R=-1,B=1<<V,T=B-1,J===i8&&B>b7||J===v7&&B>_7)return 1;for(;;){if(x=z-L,Z[F]+1<N)b=0,t=Z[F];else if(Z[F]>=N)b=S[Z[F]-N],t=D[Z[F]-N];else b=96,t=0;O=1<<z-L,P=1<<q,X=P;do P-=O,U[A+(j>>L)+P]=x<<24|b<<16|t|0;while(P!==0);O=1<<z-1;while(j&O)O>>=1;if(O!==0)j&=O-1,j+=O;else j=0;if(F++,--C[z]===0){if(z===H)break;z=Q[W+Z[F]]}if(z>V&&(j&T)!==R){if(L===0)L=V;A+=X,q=z-L,M=1<<q;while(q+L<H){if(M-=C[q+L],M<=0)break;q++,M<<=1}if(B+=1<<q,J===i8&&B>b7||J===v7&&B>_7)return 1;R=j&T,U[R]=V<<24|q<<16|A-G|0}}if(j!==0)U[A+j]=z-L<<24|4194304|0;return K.bits=V,0},J6=NY,DY=0,_9=1,f9=2,{Z_FINISH:x7,Z_BLOCK:kY,Z_TREES:h6,Z_OK:Z5,Z_STREAM_END:SY,Z_NEED_DICT:IY,Z_STREAM_ERROR:CJ,Z_DATA_ERROR:v9,Z_MEM_ERROR:x9,Z_BUF_ERROR:wY,Z_DEFLATED:h7}=K5,i6=16180,u7=16181,g7=16182,m7=16183,c7=16184,p7=16185,d7=16186,l7=16187,n7=16188,i7=16189,d6=16190,_J=16191,o8=16192,o7=16193,r8=16194,r7=16195,a7=16196,s7=16197,t7=16198,u6=16199,g6=16200,e7=16201,J9=16202,Q9=16203,W9=16204,Y9=16205,a8=16206,G9=16207,U9=16208,d=16209,h9=16210,u9=16211,yY=852,bY=592,_Y=15,fY=_Y,z9=(J)=>{return(J>>>24&255)+(J>>>8&65280)+((J&65280)<<8)+((J&255)<<24)};function vY(){this.strm=null,this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new Uint16Array(320),this.work=new Uint16Array(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}var F5=(J)=>{if(!J)return 1;let Q=J.state;if(!Q||Q.strm!==J||Q.mode<i6||Q.mode>u9)return 1;return 0},g9=(J)=>{if(F5(J))return CJ;let Q=J.state;if(J.total_in=J.total_out=Q.total=0,J.msg="",Q.wrap)J.adler=Q.wrap&1;return Q.mode=i6,Q.last=0,Q.havedict=0,Q.flags=-1,Q.dmax=32768,Q.head=null,Q.hold=0,Q.bits=0,Q.lencode=Q.lendyn=new Int32Array(yY),Q.distcode=Q.distdyn=new Int32Array(bY),Q.sane=1,Q.back=-1,Z5},m9=(J)=>{if(F5(J))return CJ;let Q=J.state;return Q.wsize=0,Q.whave=0,Q.wnext=0,g9(J)},c9=(J,Q)=>{let W;if(F5(J))return CJ;let Y=J.state;if(Q<0)W=0,Q=-Q;else if(W=(Q>>4)+5,Q<48)Q&=15;if(Q&&(Q<8||Q>15))return CJ;if(Y.window!==null&&Y.wbits!==Q)Y.window=null;return Y.wrap=W,Y.wbits=Q,m9(J)},p9=(J,Q)=>{if(!J)return CJ;let W=new vY;J.state=W,W.strm=J,W.window=null,W.mode=i6;let Y=c9(J,Q);if(Y!==Z5)J.state=null;return Y},xY=(J)=>{return p9(J,fY)},Z9=!0,s8,t8,hY=(J)=>{if(Z9){s8=new Int32Array(512),t8=new Int32Array(32);let Q=0;while(Q<144)J.lens[Q++]=8;while(Q<256)J.lens[Q++]=9;while(Q<280)J.lens[Q++]=7;while(Q<288)J.lens[Q++]=8;J6(_9,J.lens,0,288,s8,0,J.work,{bits:9}),Q=0;while(Q<32)J.lens[Q++]=5;J6(f9,J.lens,0,32,t8,0,J.work,{bits:5}),Z9=!1}J.lencode=s8,J.lenbits=9,J.distcode=t8,J.distbits=5},d9=(J,Q,W,Y)=>{let U,G=J.state;if(G.window===null)G.window=new Uint8Array(1<<G.wbits);if(G.wsize===0)G.wsize=1<<G.wbits,G.wnext=0,G.whave=0;if(Y>=G.wsize)G.window.set(Q.subarray(W-G.wsize,W),0),G.wnext=0,G.whave=G.wsize;else{if(U=G.wsize-G.wnext,U>Y)U=Y;if(G.window.set(Q.subarray(W-Y,W-Y+U),G.wnext),Y-=U,Y)G.window.set(Q.subarray(W-Y,W),0),G.wnext=Y,G.whave=G.wsize;else{if(G.wnext+=U,G.wnext===G.wsize)G.wnext=0;if(G.whave<G.wsize)G.whave+=U}}return 0},uY=(J,Q)=>{let W,Y,U,G,Z,K,$,z,F,X,H,V,q,L,M=0,B,j,O,P,R,T,A,D,N=new Uint8Array(4),C,k,S=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);if(F5(J)||!J.output||!J.input&&J.avail_in!==0)return CJ;if(W=J.state,W.mode===_J)W.mode=o8;Z=J.next_out,U=J.output,$=J.avail_out,G=J.next_in,Y=J.input,K=J.avail_in,z=W.hold,F=W.bits,X=K,H=$,D=Z5;J:for(;;)switch(W.mode){case i6:if(W.wrap===0){W.mode=o8;break}while(F<16){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if(W.wrap&2&&z===35615){if(W.wbits===0)W.wbits=15;W.check=0,N[0]=z&255,N[1]=z>>>8&255,W.check=e(W.check,N,2,0),z=0,F=0,W.mode=u7;break}if(W.head)W.head.done=!1;if(!(W.wrap&1)||(((z&255)<<8)+(z>>8))%31){J.msg="incorrect header check",W.mode=d;break}if((z&15)!==h7){J.msg="unknown compression method",W.mode=d;break}if(z>>>=4,F-=4,A=(z&15)+8,W.wbits===0)W.wbits=A;if(A>15||A>W.wbits){J.msg="invalid window size",W.mode=d;break}W.dmax=1<<W.wbits,W.flags=0,J.adler=W.check=1,W.mode=z&512?i7:_J,z=0,F=0;break;case u7:while(F<16){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if(W.flags=z,(W.flags&255)!==h7){J.msg="unknown compression method",W.mode=d;break}if(W.flags&57344){J.msg="unknown header flags set",W.mode=d;break}if(W.head)W.head.text=z>>8&1;if(W.flags&512&&W.wrap&4)N[0]=z&255,N[1]=z>>>8&255,W.check=e(W.check,N,2,0);z=0,F=0,W.mode=g7;case g7:while(F<32){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if(W.head)W.head.time=z;if(W.flags&512&&W.wrap&4)N[0]=z&255,N[1]=z>>>8&255,N[2]=z>>>16&255,N[3]=z>>>24&255,W.check=e(W.check,N,4,0);z=0,F=0,W.mode=m7;case m7:while(F<16){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if(W.head)W.head.xflags=z&255,W.head.os=z>>8;if(W.flags&512&&W.wrap&4)N[0]=z&255,N[1]=z>>>8&255,W.check=e(W.check,N,2,0);z=0,F=0,W.mode=c7;case c7:if(W.flags&1024){while(F<16){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if(W.length=z,W.head)W.head.extra_len=z;if(W.flags&512&&W.wrap&4)N[0]=z&255,N[1]=z>>>8&255,W.check=e(W.check,N,2,0);z=0,F=0}else if(W.head)W.head.extra=null;W.mode=p7;case p7:if(W.flags&1024){if(V=W.length,V>K)V=K;if(V){if(W.head){if(A=W.head.extra_len-W.length,!W.head.extra)W.head.extra=new Uint8Array(W.head.extra_len);W.head.extra.set(Y.subarray(G,G+V),A)}if(W.flags&512&&W.wrap&4)W.check=e(W.check,Y,V,G);K-=V,G+=V,W.length-=V}if(W.length)break J}W.length=0,W.mode=d7;case d7:if(W.flags&2048){if(K===0)break J;V=0;do if(A=Y[G+V++],W.head&&A&&W.length<65536)W.head.name+=String.fromCharCode(A);while(A&&V<K);if(W.flags&512&&W.wrap&4)W.check=e(W.check,Y,V,G);if(K-=V,G+=V,A)break J}else if(W.head)W.head.name=null;W.length=0,W.mode=l7;case l7:if(W.flags&4096){if(K===0)break J;V=0;do if(A=Y[G+V++],W.head&&A&&W.length<65536)W.head.comment+=String.fromCharCode(A);while(A&&V<K);if(W.flags&512&&W.wrap&4)W.check=e(W.check,Y,V,G);if(K-=V,G+=V,A)break J}else if(W.head)W.head.comment=null;W.mode=n7;case n7:if(W.flags&512){while(F<16){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if(W.wrap&4&&z!==(W.check&65535)){J.msg="header crc mismatch",W.mode=d;break}z=0,F=0}if(W.head)W.head.hcrc=W.flags>>9&1,W.head.done=!0;J.adler=W.check=0,W.mode=_J;break;case i7:while(F<32){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}J.adler=W.check=z9(z),z=0,F=0,W.mode=d6;case d6:if(W.havedict===0)return J.next_out=Z,J.avail_out=$,J.next_in=G,J.avail_in=K,W.hold=z,W.bits=F,IY;J.adler=W.check=1,W.mode=_J;case _J:if(Q===kY||Q===h6)break J;case o8:if(W.last){z>>>=F&7,F-=F&7,W.mode=a8;break}while(F<3){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}switch(W.last=z&1,z>>>=1,F-=1,z&3){case 0:W.mode=o7;break;case 1:if(hY(W),W.mode=u6,Q===h6){z>>>=2,F-=2;break J}break;case 2:W.mode=a7;break;case 3:J.msg="invalid block type",W.mode=d}z>>>=2,F-=2;break;case o7:z>>>=F&7,F-=F&7;while(F<32){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if((z&65535)!==(z>>>16^65535)){J.msg="invalid stored block lengths",W.mode=d;break}if(W.length=z&65535,z=0,F=0,W.mode=r8,Q===h6)break J;case r8:W.mode=r7;case r7:if(V=W.length,V){if(V>K)V=K;if(V>$)V=$;if(V===0)break J;U.set(Y.subarray(G,G+V),Z),K-=V,G+=V,$-=V,Z+=V,W.length-=V;break}W.mode=_J;break;case a7:while(F<14){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if(W.nlen=(z&31)+257,z>>>=5,F-=5,W.ndist=(z&31)+1,z>>>=5,F-=5,W.ncode=(z&15)+4,z>>>=4,F-=4,W.nlen>286||W.ndist>30){J.msg="too many length or distance symbols",W.mode=d;break}W.have=0,W.mode=s7;case s7:while(W.have<W.ncode){while(F<3){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}W.lens[S[W.have++]]=z&7,z>>>=3,F-=3}while(W.have<19)W.lens[S[W.have++]]=0;if(W.lencode=W.lendyn,W.lenbits=7,C={bits:W.lenbits},D=J6(DY,W.lens,0,19,W.lencode,0,W.work,C),W.lenbits=C.bits,D){J.msg="invalid code lengths set",W.mode=d;break}W.have=0,W.mode=t7;case t7:while(W.have<W.nlen+W.ndist){for(;;){if(M=W.lencode[z&(1<<W.lenbits)-1],B=M>>>24,j=M>>>16&255,O=M&65535,B<=F)break;if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if(O<16)z>>>=B,F-=B,W.lens[W.have++]=O;else{if(O===16){k=B+2;while(F<k){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if(z>>>=B,F-=B,W.have===0){J.msg="invalid bit length repeat",W.mode=d;break}A=W.lens[W.have-1],V=3+(z&3),z>>>=2,F-=2}else if(O===17){k=B+3;while(F<k){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}z>>>=B,F-=B,A=0,V=3+(z&7),z>>>=3,F-=3}else{k=B+7;while(F<k){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}z>>>=B,F-=B,A=0,V=11+(z&127),z>>>=7,F-=7}if(W.have+V>W.nlen+W.ndist){J.msg="invalid bit length repeat",W.mode=d;break}while(V--)W.lens[W.have++]=A}}if(W.mode===d)break;if(W.lens[256]===0){J.msg="invalid code -- missing end-of-block",W.mode=d;break}if(W.lenbits=9,C={bits:W.lenbits},D=J6(_9,W.lens,0,W.nlen,W.lencode,0,W.work,C),W.lenbits=C.bits,D){J.msg="invalid literal/lengths set",W.mode=d;break}if(W.distbits=6,W.distcode=W.distdyn,C={bits:W.distbits},D=J6(f9,W.lens,W.nlen,W.ndist,W.distcode,0,W.work,C),W.distbits=C.bits,D){J.msg="invalid distances set",W.mode=d;break}if(W.mode=u6,Q===h6)break J;case u6:W.mode=g6;case g6:if(K>=6&&$>=258){if(J.next_out=Z,J.avail_out=$,J.next_in=G,J.avail_in=K,W.hold=z,W.bits=F,CY(J,H),Z=J.next_out,U=J.output,$=J.avail_out,G=J.next_in,Y=J.input,K=J.avail_in,z=W.hold,F=W.bits,W.mode===_J)W.back=-1;break}W.back=0;for(;;){if(M=W.lencode[z&(1<<W.lenbits)-1],B=M>>>24,j=M>>>16&255,O=M&65535,B<=F)break;if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if(j&&(j&240)===0){P=B,R=j,T=O;for(;;){if(M=W.lencode[T+((z&(1<<P+R)-1)>>P)],B=M>>>24,j=M>>>16&255,O=M&65535,P+B<=F)break;if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}z>>>=P,F-=P,W.back+=P}if(z>>>=B,F-=B,W.back+=B,W.length=O,j===0){W.mode=Y9;break}if(j&32){W.back=-1,W.mode=_J;break}if(j&64){J.msg="invalid literal/length code",W.mode=d;break}W.extra=j&15,W.mode=e7;case e7:if(W.extra){k=W.extra;while(F<k){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}W.length+=z&(1<<W.extra)-1,z>>>=W.extra,F-=W.extra,W.back+=W.extra}W.was=W.length,W.mode=J9;case J9:for(;;){if(M=W.distcode[z&(1<<W.distbits)-1],B=M>>>24,j=M>>>16&255,O=M&65535,B<=F)break;if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if((j&240)===0){P=B,R=j,T=O;for(;;){if(M=W.distcode[T+((z&(1<<P+R)-1)>>P)],B=M>>>24,j=M>>>16&255,O=M&65535,P+B<=F)break;if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}z>>>=P,F-=P,W.back+=P}if(z>>>=B,F-=B,W.back+=B,j&64){J.msg="invalid distance code",W.mode=d;break}W.offset=O,W.extra=j&15,W.mode=Q9;case Q9:if(W.extra){k=W.extra;while(F<k){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}W.offset+=z&(1<<W.extra)-1,z>>>=W.extra,F-=W.extra,W.back+=W.extra}if(W.offset>W.dmax){J.msg="invalid distance too far back",W.mode=d;break}W.mode=W9;case W9:if($===0)break J;if(V=H-$,W.offset>V){if(V=W.offset-V,V>W.whave){if(W.sane){J.msg="invalid distance too far back",W.mode=d;break}}if(V>W.wnext)V-=W.wnext,q=W.wsize-V;else q=W.wnext-V;if(V>W.length)V=W.length;L=W.window}else L=U,q=Z-W.offset,V=W.length;if(V>$)V=$;$-=V,W.length-=V;do U[Z++]=L[q++];while(--V);if(W.length===0)W.mode=g6;break;case Y9:if($===0)break J;U[Z++]=W.length,$--,W.mode=g6;break;case a8:if(W.wrap){while(F<32){if(K===0)break J;K--,z|=Y[G++]<<F,F+=8}if(H-=$,J.total_out+=H,W.total+=H,W.wrap&4&&H)J.adler=W.check=W.flags?e(W.check,U,H,Z-H):U6(W.check,U,H,Z-H);if(H=$,W.wrap&4&&(W.flags?z:z9(z))!==W.check){J.msg="incorrect data check",W.mode=d;break}z=0,F=0}W.mode=G9;case G9:if(W.wrap&&W.flags){while(F<32){if(K===0)break J;K--,z+=Y[G++]<<F,F+=8}if(W.wrap&4&&z!==(W.total&4294967295)){J.msg="incorrect length check",W.mode=d;break}z=0,F=0}W.mode=U9;case U9:D=SY;break J;case d:D=v9;break J;case h9:return x9;case u9:default:return CJ}if(J.next_out=Z,J.avail_out=$,J.next_in=G,J.avail_in=K,W.hold=z,W.bits=F,W.wsize||H!==J.avail_out&&W.mode<d&&(W.mode<a8||Q!==x7)){if(d9(J,J.output,J.next_out,H-J.avail_out));}if(X-=J.avail_in,H-=J.avail_out,J.total_in+=X,J.total_out+=H,W.total+=H,W.wrap&4&&H)J.adler=W.check=W.flags?e(W.check,U,H,J.next_out-H):U6(W.check,U,H,J.next_out-H);if(J.data_type=W.bits+(W.last?64:0)+(W.mode===_J?128:0)+(W.mode===u6||W.mode===r8?256:0),(X===0&&H===0||Q===x7)&&D===Z5)D=wY;return D},gY=(J)=>{if(F5(J))return CJ;let Q=J.state;if(Q.window)Q.window=null;return J.state=null,Z5},mY=(J,Q)=>{if(F5(J))return CJ;let W=J.state;if((W.wrap&2)===0)return CJ;return W.head=Q,Q.done=!1,Z5},cY=(J,Q)=>{let W=Q.length,Y,U,G;if(F5(J))return CJ;if(Y=J.state,Y.wrap!==0&&Y.mode!==d6)return CJ;if(Y.mode===d6){if(U=1,U=U6(U,Q,W,0),U!==Y.check)return v9}if(G=d9(J,Q,W,W),G)return Y.mode=h9,x9;return Y.havedict=1,Z5},pY=m9,dY=c9,lY=g9,nY=xY,iY=p9,oY=uY,rY=gY,aY=mY,sY=cY,tY="pako inflate (from Nodeca project)",DJ={inflateReset:pY,inflateReset2:dY,inflateResetKeep:lY,inflateInit:nY,inflateInit2:iY,inflate:oY,inflateEnd:rY,inflateGetHeader:aY,inflateSetDictionary:sY,inflateInfo:tY};function eY(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}var JG=eY,l9=Object.prototype.toString,{Z_NO_FLUSH:QG,Z_FINISH:K9,Z_OK:T5,Z_STREAM_END:e8,Z_NEED_DICT:J0,Z_STREAM_ERROR:WG,Z_DATA_ERROR:F9,Z_MEM_ERROR:YG,Z_BUF_ERROR:X9}=K5,GG={chunkSize:65536,windowBits:15,to:""};function $6(J){this.options=n6.assign({},GG,J||{});let Q=this.options;if(Q.raw&&Q.windowBits>=0&&Q.windowBits<16){if(Q.windowBits=-Q.windowBits,Q.windowBits===0)Q.windowBits=-15}if(Q.windowBits>=0&&Q.windowBits<16&&!(J&&J.windowBits))Q.windowBits+=32;if(Q.windowBits>15&&Q.windowBits<48){if((Q.windowBits&15)===0)Q.windowBits|=15}this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new y9,this.strm.avail_out=0;let W=DJ.inflateInit2(this.strm,Q.windowBits);if(W!==T5)throw Error(G5[W]);if(this.header=new JG,DJ.inflateGetHeader(this.strm,this.header),Q.dictionary){if(typeof Q.dictionary==="string")Q.dictionary=Z6.string2buf(Q.dictionary);else if(l9.call(Q.dictionary)==="[object ArrayBuffer]")Q.dictionary=new Uint8Array(Q.dictionary);if(Q.raw){if(W=DJ.inflateSetDictionary(this.strm,Q.dictionary),W!==T5)throw Error(G5[W])}}}$6.prototype.push=function(J,Q){let W=this.strm,Y=this.options.chunkSize,U=this.options.dictionary,G,Z,K;if(this.ended)return!1;if(Q===~~Q)Z=Q;else Z=Q===!0?K9:QG;if(l9.call(J)==="[object ArrayBuffer]")W.input=new Uint8Array(J);else W.input=J;W.next_in=0,W.avail_in=W.input.length;for(;;){if(W.avail_out===0)W.output=new Uint8Array(Y),W.next_out=0,W.avail_out=Y;if(G=DJ.inflate(W,Z),G===J0&&U){if(G=DJ.inflateSetDictionary(W,U),G===T5)G=DJ.inflate(W,Z);else if(G===F9)G=J0}while(W.avail_in>0&&G===e8&&W.state.wrap&2&&W.state.flags!==0&&W.input[W.next_in]!==0)DJ.inflateReset(W),G=DJ.inflate(W,Z);switch(G){case WG:case F9:case J0:case YG:return this.onEnd(G),this.ended=!0,!1}if(K=W.avail_out,W.next_out){if(W.avail_out===0||G===e8||Z>0)if(this.options.to==="string"){let $=Z6.utf8border(W.output,W.next_out),z=W.next_out-$,F=Z6.buf2string(W.output,$);if(W.next_out=z,W.avail_out=Y-z,z)W.output.set(W.output.subarray($,$+z),0);this.onData(F)}else this.onData(W.output.length===W.next_out?W.output:W.output.subarray(0,W.next_out)),W.avail_out=0,W.next_out=0}if((G===T5||G===X9)&&K===0)continue;if(G===e8)return G=DJ.inflateEnd(this.strm),this.onEnd(G),this.ended=!0,!0;if(W.avail_in===0){if(Z===K9)return G=DJ.inflateEnd(this.strm),this.onEnd(G===T5?X9:G),this.ended=!0,!1;break}}return!0};$6.prototype.onData=function(J){this.chunks.push(J)};$6.prototype.onEnd=function(J){if(J===T5)if(this.options.to==="string")this.result=this.chunks.join("");else this.result=n6.flattenChunks(this.chunks);this.chunks=[],this.err=J,this.msg=this.strm.msg};function j0(J,Q){let W=new $6(Q);if(W.push(J,!0),W.err)throw W.msg||G5[W.err];return W.result}function UG(J,Q){return Q=Q||{},Q.raw=!0,j0(J,Q)}var zG=$6,ZG=j0,KG=UG,FG=j0,XG=K5,$G={Inflate:zG,inflate:ZG,inflateRaw:KG,ungzip:FG,constants:XG},{Deflate:HG,deflate:VG,deflateRaw:qG,gzip:LG}=PY,{Inflate:BG,inflate:jG,inflateRaw:MG,ungzip:PG}=$G,OG=HG,CG=VG,RG=qG,AG=LG,TG=BG,EG=jG,NG=MG,DG=PG,kG=K5,M0={Deflate:OG,deflate:CG,deflateRaw:RG,gzip:AG,Inflate:TG,inflate:EG,inflateRaw:NG,ungzip:DG,constants:kG};var V5=new i5({ignoreAttributes:!1,attributeNamePrefix:"@_",textNodeName:"#text",trimValues:!1}),y5=new g8({ignoreAttributes:!1,attributeNamePrefix:"@_",textNodeName:"#text",format:!1,suppressEmptyNode:!0}),H1=[".drawio",".xml"],n9=[...H1,".bak"],q5=20971520,wG=104857600,yG="http://127.0.0.1:18765/ImageExport4/export",w0="#ffffff",B6=43200000,bG=3000,i9=20,V1=1800000,o9=7200000,AJ="__ai_preview_",_G=20,fG=2000,vG=2,xG=0.25,hG=8388608,q1=1,L1=1,j6=/^h_[A-Za-z0-9_-]+_[A-Fa-f0-9]{8,}$/,y0=/^[A-Za-z0-9_.:-]+$/,uG=["DRAWIO_WEB_URL","DRAWIO_BRIDGE_HOST","DRAWIO_BRIDGE_PORT","DRAWIO_EXPORT_URL","DRAWIO_REQUEST_TIMEOUT","DRAWIO_MAX_INPUT_SIZE_MB","DRAWIO_MAX_OUTPUT_SIZE_MB"],h0="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;jumpStyle=arc;jumpSize=10;endArrow=block;endFill=1;";function xJ(J){if(J===void 0)return[];return Array.isArray(J)?J:[J]}function I(J){return J===void 0||J===null?void 0:String(J)}function GJ(J){if(J===void 0||J===null||J==="")return;let Q=Number(J);return Number.isFinite(Q)?Q:void 0}function yJ(J){return J.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;")}function B1(J){let Q=J.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase();if(/^[\x00-\x7f]*$/.test(J)&&Q)return Q;let W=F8("sha256").update(J).digest("hex").slice(0,12);return`${Q||"diagram"}-${W}`}function f5(J){let Q=J.directory.trim();if(!Q)throw Error("OpenCode did not provide a workspace directory");return E.resolve(Q)}async function j1(J){let Q=E.join(f5({directory:J}),".env"),W;try{W=await y.readFile(Q,"utf8")}catch(U){if(U.code==="ENOENT")return;throw Error(`cannot read workspace .env at ${Q}: ${U.message}`)}let Y={};for(let U of W.replace(/^\uFEFF/,"").split(/\r?\n/)){let G=U.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);if(!G)continue;let[,Z,K]=G,$=K.trim(),z=$[0],F=z==='"'||z==="'"||z==="`"?$.lastIndexOf(z):-1,X=F>0?$.slice(1,F):$.replace(/\s+#.*$/,"").trim();if(z==='"'&&F>0)X=X.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\"/g,'"').replace(/\\\\/g,"\\");Y[Z]=X}for(let U of uG)if(!process.env[U]?.trim()&&Y[U]!==void 0)process.env[U]=Y[U]}function m(J,Q){return E.relative(f5(J),Q)}function Q8(J,Q,W){if(!Q.trim())throw Error("file must be a non-empty path");if(E.isAbsolute(Q))throw Error("absolute paths are not allowed; use a workspace-relative path");let Y=f5(J),U=E.resolve(Y,Q),G=E.relative(Y,U),Z=String.fromCharCode(46).repeat(2);if(!G||G===Z||G.startsWith(Z+E.sep)||E.isAbsolute(G))throw Error("file must resolve to a file inside the current workspace");let K=U.toLowerCase();if(!W.some(($)=>K.endsWith($)))throw Error(`unsupported file extension; expected ${W.join(" or ")}`);return U}function RJ(J,Q){return Q8(J,Q,H1)}async function jJ(J){let Q=await y.stat(J);if(!Q.isFile())throw Error("target is not a regular file");if(Q.size>q5)throw Error(`file is larger than the ${q5/1024/1024} MB MVP limit`);return y.readFile(J,"utf8")}function M1(J){let Q=Buffer.from(J.trim(),"base64"),W=new TextDecoder().decode(M0.inflateRaw(Q));return decodeURIComponent(W)}function P1(J){let Q=encodeURIComponent(J),W=M0.deflateRaw(new TextEncoder().encode(Q));return Buffer.from(W).toString("base64")}function gG(J){let Q=J.mxGeometry;if(!Q||typeof Q!=="object")return;let W=Q,U=xJ(W.Array).filter(($)=>I($["@_as"])==="points").flatMap(($)=>xJ($.mxPoint)).map(($)=>({x:GJ($["@_x"]),y:GJ($["@_y"])})).filter(($)=>$.x!==void 0&&$.y!==void 0),G=xJ(W.mxPoint).find(($)=>I($["@_as"])==="offset"),Z=G?GJ(G["@_x"]):void 0,K=G?GJ(G["@_y"]):void 0;return{x:GJ(W["@_x"]),y:GJ(W["@_y"]),width:GJ(W["@_width"]),height:GJ(W["@_height"]),relative:I(W["@_relative"])==="1",offset:Z!==void 0||K!==void 0?{x:Z||0,y:K||0}:void 0,points:U}}function P0(J){let Q=f6.validate(J);if(Q!==!0)throw Error(`invalid mxGraphModel XML: ${JSON.stringify(Q)}`);let U=V5.parse(J).mxGraphModel?.root;if(!U)throw Error("diagram page does not contain mxGraphModel/root");return xJ(U.mxCell).map((G)=>({id:I(G["@_id"])||"",parent:I(G["@_parent"]),source:I(G["@_source"]),target:I(G["@_target"]),label:I(G["@_value"]),style:I(G["@_style"]),vertex:I(G["@_vertex"])==="1",edge:I(G["@_edge"])==="1",geometry:gG(G)}))}function O0(J){let W=V5.parse(J).mxGraphModel;return{background:I(W?.["@_background"])||""}}function f(J){let Q=f6.validate(J);if(Q!==!0)throw Error(`invalid draw.io XML: ${JSON.stringify(Q)}`);let W=V5.parse(J);if(W.mxGraphModel)return[{id:"page-1",name:"Page-1",compressed:!1,properties:O0(J),cells:P0(J)}];let Y=W.mxfile;if(!Y)throw Error("root element must be mxfile or mxGraphModel");let U=xJ(Y.diagram);if(U.length===0)throw Error("mxfile contains no diagram pages");return U.map((G,Z)=>{let K=I(G["@_id"])||`page-${Z+1}`,$=I(G["@_name"])||`Page-${Z+1}`,z=G.mxGraphModel;if(z&&typeof z==="object"){let H=y5.build({mxGraphModel:z});return{id:K,name:$,compressed:!1,properties:O0(H),cells:P0(H)}}let F=I(G["#text"]);if(!F?.trim())throw Error(`page ${$} has no diagram data`);let X=M1(F);return{id:K,name:$,compressed:!0,properties:O0(X),cells:P0(X)}})}function H5(J){let Q=f6.validate(J);if(Q!==!0)throw Error(`invalid draw.io XML: ${JSON.stringify(Q)}`);let W=V5.parse(J);if(W.mxGraphModel&&typeof W.mxGraphModel==="object")return{document:W,directModel:!0,pages:[{id:"page-1",name:"Page-1",compressed:!1,diagram:null,model:W.mxGraphModel}]};let Y=W.mxfile;if(!Y)throw Error("root element must be mxfile or mxGraphModel");let U=xJ(Y.diagram);if(U.length===0)throw Error("mxfile contains no diagram pages");let G=U.map((Z,K)=>{let $={id:I(Z["@_id"])||`page-${K+1}`,name:I(Z["@_name"])||`Page-${K+1}`,compressed:!1,diagram:Z,model:{}};if(Z.mxGraphModel&&typeof Z.mxGraphModel==="object")return $.model=Z.mxGraphModel,$;let z=I(Z["#text"]);if(!z?.trim())throw Error(`page ${$.name} has no diagram data`);let F=V5.parse(M1(z));if(!F.mxGraphModel||typeof F.mxGraphModel!=="object")throw Error(`page ${$.name} has no mxGraphModel`);return $.compressed=!0,$.model=F.mxGraphModel,$});return{document:W,directModel:!1,pages:G}}function M6(J){if(J.directModel)return J.document.mxGraphModel=J.pages[0].model,`${y5.build(J.document)}
`;for(let Q of J.pages){let W=Q.diagram;if(Q.compressed)delete W.mxGraphModel,W["#text"]=P1(y5.build({mxGraphModel:Q.model}));else delete W["#text"],W.mxGraphModel=Q.model}return`${y5.build(J.document)}
`}function L5(J){let Q=J.model.root;if(!Q)throw Error(`page ${J.name} has no mxGraphModel/root`);let W=xJ(Q.mxCell);return Q.mxCell=W,W}function r9(J,Q){if(!Q?.trim())return J.pages[0];let W=J.pages.find((Y)=>Y.id===Q||Y.name===Q);if(!W)throw Error(`diagram page not found: ${Q}`);return W}function JJ(J){return I(J["@_id"])||""}function lJ(J){return I(J["@_vertex"])==="1"}function t6(J){return I(J["@_edge"])==="1"}function nJ(J){if(!J.mxGeometry||typeof J.mxGeometry!=="object")J.mxGeometry={"@_as":"geometry"};return J.mxGeometry}function mG(J){let Q=J.filter(lJ);if(Q.length===0)return{x:80,y:80};let W=80;for(let Y of Q){let U=nJ(Y),G=GJ(U["@_y"])||0,Z=GJ(U["@_height"])||70;W=Math.max(W,G+Z)}return{x:80,y:W+60}}var cG={font_size:"fontSize",font_family:"fontFamily",font_color:"fontColor",fill_color:"fillColor",stroke_color:"strokeColor",stroke_width:"strokeWidth",opacity:"opacity",rounded:"rounded",dashed:"dashed"};function O1(J){return(J||"").split(";").map((Q)=>Q.trim()).filter(Boolean).map((Q)=>{let W=Q.indexOf("=");return W<0?[Q,""]:[Q.slice(0,W),Q.slice(W+1)]})}function pG(J){return Object.fromEntries(O1(J).toSorted(([Q],[W])=>Q.localeCompare(W)))}function o6(J,Q){if(!Q)return J||"";let W=O1(J),Y=new Map(W);for(let[Z,K]of Object.entries(cG)){let $=Q[Z];if($===void 0)continue;if(typeof $==="string"&&(!$.trim()||/[;=\r\n]/.test($)))throw Error(`style_updates.${Z} contains an unsafe Draw.io style delimiter`);Y.set(K,typeof $==="boolean"?$?"1":"0":String($))}let U=new Set,G=[];for(let[Z]of W){if(U.has(Z))continue;U.add(Z);let K=Y.get(Z)||"";G.push(`${Z}${K===""?"":`=${K}`}`)}for(let[Z,K]of Y){if(U.has(Z))continue;G.push(`${Z}${K===""?"":`=${K}`}`)}return G.length>0?`${G.join(";")};`:""}function dG(J,Q){let W=L5(J),Y=[],U=(G)=>W.find((Z)=>JJ(Z)===G);for(let G of Q){if(!y0.test(G.id)||G.id==="0"||G.id==="1")throw Error(`invalid or reserved operation id: ${G.id}`);let Z=U(G.id);if(G.type==="add-node"){if(Z)throw Error(`cell already exists: ${G.id}`);if(!G.label?.trim())throw Error(`add-node ${G.id} requires label`);let K=mG(W);W.push({"@_id":G.id,"@_value":G.label,"@_style":o6(b0(G.kind),G.style_updates),"@_vertex":"1","@_parent":"1",mxGeometry:{"@_x":G.x??K.x,"@_y":G.y??K.y,"@_width":G.width??(G.kind==="decision"?140:160),"@_height":G.height??(G.kind==="decision"?100:70),"@_as":"geometry"}}),Y.push(G.id);continue}if(G.type==="add-edge"){if(Z)throw Error(`cell already exists: ${G.id}`);if(!G.source||!U(G.source)||!lJ(U(G.source)))throw Error(`add-edge ${G.id} has unknown vertex source: ${G.source||"(empty)"}`);if(!G.target||!U(G.target)||!lJ(U(G.target)))throw Error(`add-edge ${G.id} has unknown vertex target: ${G.target||"(empty)"}`);W.push({"@_id":G.id,"@_value":G.label||"","@_style":o6(h0,G.style_updates),"@_edge":"1","@_parent":"1","@_source":G.source,"@_target":G.target,mxGeometry:{"@_relative":"1","@_as":"geometry"}}),Y.push(G.id);continue}if(!Z)throw Error(`cell not found: ${G.id}`);if(G.type==="update-node"){if(!lJ(Z))throw Error(`${G.id} is not a node`);if(G.label!==void 0)Z["@_value"]=G.label;if(G.kind!==void 0)Z["@_style"]=b0(G.kind);if(G.style_updates!==void 0)Z["@_style"]=o6(I(Z["@_style"]),G.style_updates);let K=nJ(Z);if(G.x!==void 0)K["@_x"]=G.x;if(G.y!==void 0)K["@_y"]=G.y;if(G.width!==void 0)K["@_width"]=G.width;if(G.height!==void 0)K["@_height"]=G.height;Y.push(G.id);continue}if(G.type==="update-edge"){if(!t6(Z))throw Error(`${G.id} is not an edge`);if(G.source!==void 0){let K=U(G.source);if(!K||!lJ(K))throw Error(`update-edge ${G.id} has unknown vertex source: ${G.source}`);Z["@_source"]=G.source}if(G.target!==void 0){let K=U(G.target);if(!K||!lJ(K))throw Error(`update-edge ${G.id} has unknown vertex target: ${G.target}`);Z["@_target"]=G.target}if(G.label!==void 0)Z["@_value"]=G.label;if(G.style_updates!==void 0)Z["@_style"]=o6(I(Z["@_style"]),G.style_updates);Y.push(G.id);continue}if(G.type==="remove-edge"){if(!t6(Z))throw Error(`${G.id} is not an edge`);W.splice(W.indexOf(Z),1),Y.push(G.id);continue}if(G.type==="remove-node"){if(!lJ(Z))throw Error(`${G.id} is not a node`);let K=W.filter(($)=>t6($)&&(I($["@_source"])===G.id||I($["@_target"])===G.id));if(K.length>0&&!G.cascade)throw Error(`remove-node ${G.id} has ${K.length} connected edge(s); set cascade=true`);for(let $ of K)Y.push(JJ($)),W.splice(W.indexOf($),1);W.splice(W.indexOf(Z),1),Y.push(G.id)}}return[...new Set(Y)]}function a9(J){let Q=new Map;for(let W of J)for(let Y of W.cells)if(Y.vertex||Y.edge)Q.set(`${W.id}:${Y.id}`,Y);return Q}function oJ(J){return{label:J.label||"",parent:J.parent||"",source:J.source||"",target:J.target||"",style:pG(J.style),geometry:J.geometry||{}}}function X5(J,Q){let W=a9(J),Y=a9(Q),U=[],G=[],Z=[],K=[];for(let[F,X]of Y){if(!W.has(F)){U.push({key:F,cell:X});continue}let H=oJ(W.get(F)),V=oJ(X);if(JSON.stringify(H)!==JSON.stringify(V)){let q=Object.keys(V).filter((P)=>JSON.stringify(H[P])!==JSON.stringify(V[P])),M=[...new Set([...Object.keys(H.style),...Object.keys(V.style)])].filter((P)=>H.style[P]!==V.style[P]).sort().map((P)=>({property:P,before:H.style[P]??null,after:V.style[P]??null})),j=[...new Set([...Object.keys(H.geometry),...Object.keys(V.geometry)])].filter((P)=>JSON.stringify(H.geometry[P])!==JSON.stringify(V.geometry[P])).sort().map((P)=>({property:P,before:H.geometry[P]??null,after:V.geometry[P]??null})),O=F.slice(0,Math.max(0,F.length-X.id.length-1));Z.push({key:F,pageId:O,cellId:X.id,kind:X.edge?"edge":"node",changedFields:q,styleChanges:M,geometryChanges:j,labelChange:H.label!==V.label?{before:H.label,after:V.label}:null,before:H,after:V})}}for(let[F,X]of W)if(!Y.has(F))G.push({key:F,cell:X});let $=new Map(J.map((F)=>[F.id,F])),z=new Map(Q.map((F)=>[F.id,F]));for(let F of new Set([...$.keys(),...z.keys()])){let X=$.get(F),H=z.get(F),V=H?.name||X?.name||F;if(!X||!H){K.push({pageId:F,pageName:V,property:"page",before:X?"present":null,after:H?"present":null});continue}if(X.name!==H.name)K.push({pageId:F,pageName:V,property:"name",before:X.name,after:H.name});if(X.properties.background!==H.properties.background)K.push({pageId:F,pageName:V,property:"background",before:X.properties.background||null,after:H.properties.background||null})}return{added:U,removed:G,changed:Z,pageChanges:K,summary:{added:U.length,removed:G.length,changed:Z.length,pagesChanged:new Set(K.map((F)=>F.pageId)).size,unchanged:[...Y.keys()].filter((F)=>W.has(F)&&JSON.stringify(oJ(W.get(F)))===JSON.stringify(oJ(Y.get(F)))).length}}}function W8(J){if(Array.isArray(J))return J.map(W8);if(!J||typeof J!=="object")return J;return Object.fromEntries(Object.entries(J).sort(([Q],[W])=>Q.localeCompare(W)).map(([Q,W])=>[Q,W8(W)]))}function b5(J){return J===void 0?"<missing>":JSON.stringify(W8(J))}function C1(J,Q,W,Y=[]){let U=b5(J),G=b5(Q),Z=b5(W);if(G===Z)return{userValue:Q,agentValue:Q,conflicts:[]};if(G===U)return{userValue:W,agentValue:W,conflicts:[]};if(Z===U)return{userValue:Q,agentValue:Q,conflicts:[]};if(l(J)&&l(Q)&&l(W)){let K={},$={},z=[],F=new Set([...Object.keys(J),...Object.keys(Q),...Object.keys(W)]);for(let X of F){let H=C1(J[X],Q[X],W[X],[...Y,X]);if(H.userValue!==void 0)K[X]=H.userValue;if(H.agentValue!==void 0)$[X]=H.agentValue;z.push(...H.conflicts)}return{userValue:K,agentValue:$,conflicts:z}}return{userValue:Q,agentValue:W,conflicts:[{path:Y.join(".")||"existence",user:{exists:Q!==void 0,value:Q},agent:{exists:W!==void 0,value:W}}]}}function C0(J){let Q=new Map;for(let W of L5(J)){let Y=I(W["@_id"]);if(!Y)throw Error(`page ${J.name} contains a cell without a stable id`);if(Q.has(Y))throw Error(`page ${J.name} contains duplicate cell id ${Y}`);Q.set(Y,W)}return Q}function R0(J){if(!J)return{exists:!1,kind:"cell",label:"",style:"",parent:null,source:null,target:null,geometry:null};let Q=l(J.mxGeometry)?J.mxGeometry:null;return{exists:!0,kind:I(J["@_vertex"])==="1"?"node":I(J["@_edge"])==="1"?"edge":"cell",label:I(J["@_value"]),style:I(J["@_style"]),parent:I(J["@_parent"])||null,source:I(J["@_source"])||null,target:I(J["@_target"])||null,geometry:Q?{x:I(Q["@_x"])||null,y:I(Q["@_y"])||null,width:I(Q["@_width"])||null,height:I(Q["@_height"])||null}:null}}function A0(J){let Q=J.diagram?Object.fromEntries(Object.entries(J.diagram).filter(([U])=>U!=="mxGraphModel"&&U!=="#text")):null,W=Object.fromEntries(Object.entries(J.model).filter(([U])=>!["root","@_dx","@_dy"].includes(U))),Y=J.model.root&&typeof J.model.root==="object"?Object.fromEntries(Object.entries(J.model.root).filter(([U])=>U!=="mxCell")):null;return JSON.stringify(W8({diagram:Q,model:W,root:Y}))}function s9(J,Q,W,Y,U){let G=L5(J.get(W)),Z=G.findIndex((X)=>I(X["@_id"])===Y);if(U===void 0){if(Z>=0)G.splice(Z,1);return}if(Z>=0){G[Z]=structuredClone(U);return}let K=L5(Q.get(W)).map((X)=>I(X["@_id"])),$=K.indexOf(Y),z=[...K.slice(0,$)].reverse().find((X)=>G.some((H)=>I(H["@_id"])===X)),F=K.slice($+1).find((X)=>G.some((H)=>I(H["@_id"])===X));if(z){let X=G.findIndex((H)=>I(H["@_id"])===z);G.splice(X+1,0,structuredClone(U))}else if(F){let X=G.findIndex((H)=>I(H["@_id"])===F);G.splice(X,0,structuredClone(U))}else G.push(structuredClone(U))}function lG(J,Q,W){try{let Y=H5(J),U=H5(Q),G=H5(W);if(Y.directModel!==U.directModel||Y.directModel!==G.directModel)return{status:"unavailable",reason:"document container structure changed"};let Z=new Map(Y.pages.map((C)=>[C.id,C])),K=new Map(U.pages.map((C)=>[C.id,C])),$=new Map(G.pages.map((C)=>[C.id,C])),z=[...Z.keys()].sort();if(JSON.stringify([...K.keys()].sort())!==JSON.stringify(z)||JSON.stringify([...$.keys()].sort())!==JSON.stringify(z))return{status:"unavailable",reason:"page additions or removals require user confirmation"};let F=Y.pages.map((C)=>C.id),X=U.pages.map((C)=>C.id),H=G.pages.map((C)=>C.id);if(JSON.stringify(X)!==JSON.stringify(F)&&JSON.stringify(X)!==JSON.stringify(H))return{status:"unavailable",reason:"local page order changed"};let V=[],q=[],L=[],M=[],B=[];for(let C of z){let k=Z.get(C),S=K.get(C),x=$.get(C),b=A0(k),t=A0(S),c=A0(x);if(t!==b&&t!==c)return{status:"unavailable",reason:`local page metadata changed for ${C}`};let YJ=C0(k),i=C0(S),v=C0(x),n=new Set([...YJ.keys()].filter((o)=>i.has(o)&&v.has(o))),tJ=[...YJ.keys()].filter((o)=>n.has(o)),t0=[...i.keys()].filter((o)=>n.has(o)),QQ=[...v.keys()].filter((o)=>n.has(o));if(JSON.stringify(t0)!==JSON.stringify(tJ)&&JSON.stringify(t0)!==JSON.stringify(QQ))return{status:"unavailable",reason:`local cell order changed for page ${C}`};let WQ=new Set([...YJ.keys(),...i.keys(),...v.keys()]);for(let o of WQ){let v5=`${C}:${o}`,e0=b5(YJ.get(o)),YQ=b5(i.get(o)),GQ=b5(v.get(o)),UQ=YQ!==e0,zQ=GQ!==e0;if(UQ)V.push(v5);if(zQ)q.push(v5);let x5=C1(YJ.get(o),i.get(o),v.get(o));if(B.push({key:v5,pageId:C,cellId:o,userCell:x5.userValue,agentCell:x5.agentValue}),x5.conflicts.length>0){L.push(v5);let ZQ=R0(YJ.get(o)),KQ=R0(i.get(o)),FQ=R0(v.get(o));M.push({key:v5,pageId:C,pageName:k.name,cellId:o,changedFields:x5.conflicts.map((XQ)=>XQ.path),fields:x5.conflicts,base:ZQ,user:KQ,agent:FQ})}}}let j=structuredClone(G),O=structuredClone(G),P=new Map(j.pages.map((C)=>[C.id,C])),R=new Map(O.pages.map((C)=>[C.id,C]));for(let C of B)s9(P,K,C.pageId,C.cellId,C.userCell),s9(R,K,C.pageId,C.cellId,C.agentCell);let T=M6(j),A=M6(O),D=a(f(T)),N=a(f(A));if(!D.valid||!N.valid)return{status:"unavailable",reason:`merged diagram is invalid: ${[...D.errors,...N.errors].join("; ")}`};if(L.length>0)return{status:"conflict",conflicts:L,details:M,userResolutionXml:T,agentResolutionXml:A,localChangedKeys:V,remoteChangedKeys:q};return{status:"merged",xml:T,localChangedKeys:V,remoteChangedKeys:q}}catch(Y){return{status:"unavailable",reason:`automatic merge failed: ${Y.message}`}}}function nG(J,Q){if(J.length===0)throw Error("nodes must contain at least one node");let W=new Set;for(let U of J){if(!y0.test(U.id)||U.id==="0"||U.id==="1")throw Error(`invalid or reserved node id: ${U.id}`);if(!U.label.trim())throw Error(`node ${U.id} has an empty label`);if(W.has(U.id))throw Error(`duplicate node id: ${U.id}`);W.add(U.id)}let Y=new Set;for(let[U,G]of Q.entries()){let Z=G.id||`edge-${U+1}`;if(!y0.test(Z)||Z==="0"||Z==="1")throw Error(`invalid or reserved edge id: ${Z}`);if(Y.has(Z)||W.has(Z))throw Error(`duplicate cell id: ${Z}`);if(!W.has(G.source))throw Error(`edge ${Z} has unknown source: ${G.source}`);if(!W.has(G.target))throw Error(`edge ${Z} has unknown target: ${G.target}`);Y.add(Z)}}function R1(J,Q){let W=new Map(J.map((K)=>[K.id,0])),Y=new Map(J.map((K)=>[K.id,[]])),U=new Map(J.map((K)=>[K.id,0]));for(let K of Q)W.set(K.target,(W.get(K.target)||0)+1),Y.get(K.source)?.push(K.target);let G=J.filter((K)=>W.get(K.id)===0).map((K)=>K.id),Z=new Set;while(G.length>0){let K=G.shift();if(Z.has(K))continue;Z.add(K);for(let $ of Y.get(K)||[])if(U.set($,Math.max(U.get($)||0,(U.get(K)||0)+1)),W.set($,(W.get($)||1)-1),W.get($)===0)G.push($)}return U}function b0(J){return"rounded=1;whiteSpace=wrap;html=1;arcSize=12;strokeWidth=1.5;"+{default:"fillColor=#dae8fc;strokeColor=#6c8ebf;",application:"fillColor=#d5e8d4;strokeColor=#82b366;",service:"fillColor=#dae8fc;strokeColor=#6c8ebf;",database:"shape=cylinder3;boundedLbl=1;backgroundOutline=1;fillColor=#fff2cc;strokeColor=#d6b656;",external:"dashed=1;fillColor=#f5f5f5;strokeColor=#666666;",decision:"rhombus;fillColor=#ffe6cc;strokeColor=#d79b00;"}[J||"default"]}function Y8(J,Q){return(J+1)/(Q+1)}function iG(J,Q,W){let Y=R1(J,Q),U=new Map,G=Math.max(1,...J.map((X)=>Q.filter((H)=>H.source===X.id).length)),Z=Math.max(240,200+G*20),K=140,$=new Map;for(let X of J){let H=Y.get(X.id)||0,V=U.get(H)||[];V.push(X),U.set(H,V)}for(let X of J){let H=Y.get(X.id)||0,V=(U.get(H)||[]).findIndex((M)=>M.id===X.id),q=X.kind==="decision"?140:160,L=X.kind==="decision"?100:70;$.set(X.id,{x:W==="left-to-right"?80+H*Z:80+V*Z,y:W==="left-to-right"?80+V*140:80+H*140,width:q,height:L})}let z=J.map((X)=>{let H=$.get(X.id);return`      <mxCell id="${yJ(X.id)}" value="${yJ(X.label)}" style="${yJ(b0(X.kind))}" vertex="1" parent="1">
        <mxGeometry x="${H.x}" y="${H.y}" width="${H.width}" height="${H.height}" as="geometry"/>
      </mxCell>`}),F=Q.map((X,H)=>{let V=X.id||`edge-${H+1}`,q=$.get(X.source),L=$.get(X.target),M=(C)=>{let k=$.get(C);return W==="left-to-right"?k.y+k.height/2:k.x+k.width/2},B=Q.filter((C)=>C.source===X.source).sort((C,k)=>M(C.target)-M(k.target)||Q.indexOf(C)-Q.indexOf(k)),j=B.indexOf(X),O=Q.filter((C)=>C.target===X.target).sort((C,k)=>M(C.source)-M(k.source)||Q.indexOf(C)-Q.indexOf(k)),P=O.indexOf(X),R=Y8(j,B.length),T=Y8(P,O.length),A=((B.length-1)/2-j)*18,D=h0,N;if(W==="left-to-right"){let C=q.x+q.width,k=L.x,S=k>C?(C+k)/2+A:Math.max(C,L.x+L.width)+80+j*18,x=q.y+q.height*R,b=L.y+L.height*T;D+=`exitX=1;exitY=${R};exitDx=0;exitDy=0;entryX=0;entryY=${T};entryDx=0;entryDy=0;`,N=`          <mxPoint x="${S}" y="${x}"/>
          <mxPoint x="${S}" y="${b}"/>`}else{let C=q.y+q.height,k=L.y,S=k>C?(C+k)/2+A:Math.max(C,L.y+L.height)+80+j*18,x=q.x+q.width*R,b=L.x+L.width*T;D+=`exitX=${R};exitY=1;exitDx=0;exitDy=0;entryX=${T};entryY=0;entryDx=0;entryDy=0;`,N=`          <mxPoint x="${x}" y="${S}"/>
          <mxPoint x="${b}" y="${S}"/>`}return`      <mxCell id="${yJ(V)}" value="${yJ(X.label||"")}" style="${D}" edge="1" parent="1" source="${yJ(X.source)}" target="${yJ(X.target)}">
        <mxGeometry relative="1" as="geometry">
          <Array as="points">
${N}
          </Array>
        </mxGeometry>
      </mxCell>`});return`<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
${[...z,...F].join(`
`)}
  </root>
</mxGraphModel>`}function t9(J,Q,W,Y,U){let G=iG(Q,W,Y),Z=`page-${B1(J)}`,K=U?P1(G):G;return`<mxfile host="OpenWork" modified="${new Date().toISOString()}" agent="drawio-expert" version="26.0.0">
  <diagram id="${yJ(Z)}" name="${yJ(J)}">${K}</diagram>
</mxfile>
`}function a(J){let Q=[],W=[];for(let Y of J){let U=new Set;for(let Z of Y.cells){if(!Z.id){Q.push(`${Y.name}: cell without id`);continue}if(U.has(Z.id))Q.push(`${Y.name}: duplicate cell id ${Z.id}`);U.add(Z.id)}for(let Z of Y.cells){if(Z.parent&&!U.has(Z.parent))Q.push(`${Y.name}: ${Z.id} references missing parent ${Z.parent}`);if(Z.edge){if(!Z.source||!U.has(Z.source))Q.push(`${Y.name}: edge ${Z.id} has missing source ${Z.source||"(empty)"}`);if(!Z.target||!U.has(Z.target))Q.push(`${Y.name}: edge ${Z.id} has missing target ${Z.target||"(empty)"}`)}if(Z.vertex){if(!Z.geometry)Q.push(`${Y.name}: vertex ${Z.id} has no geometry`);else if(Z.geometry.width!==void 0&&Z.geometry.width<=0||Z.geometry.height!==void 0&&Z.geometry.height<=0)Q.push(`${Y.name}: vertex ${Z.id} has non-positive dimensions`);if(!Z.label?.trim())W.push(`${Y.name}: vertex ${Z.id} has an empty label`)}}let G=Y.cells.filter((Z)=>Z.vertex&&Z.geometry?.x!==void 0&&Z.geometry?.y!==void 0&&Z.geometry?.width!==void 0&&Z.geometry?.height!==void 0);for(let Z=0;Z<G.length;Z+=1){let K=G[Z];for(let $=Z+1;$<G.length;$+=1){let z=G[$];if(K.parent!==z.parent)continue;let F=K.geometry,X=z.geometry;if(F.x<X.x+X.width&&F.x+F.width>X.x&&F.y<X.y+X.height&&F.y+F.height>X.y)W.push(`${Y.name}: nodes ${K.id} and ${z.id} overlap`)}}}return{valid:Q.length===0,errors:Q,warnings:W,stats:{pages:J.length,nodes:J.reduce((Y,U)=>Y+U.cells.filter((G)=>G.vertex).length,0),edges:J.reduce((Y,U)=>Y+U.cells.filter((G)=>G.edge).length,0)}}}function _5(J){return{cellsById:new Map(J.map((Q)=>[Q.id,Q])),absoluteGeometry:new Map}}function u0(J,Q,W=new Set){if(Q.absoluteGeometry.has(J.id))return Q.absoluteGeometry.get(J.id)||null;let Y=J.geometry;if(!Y)return Q.absoluteGeometry.set(J.id,null),null;if(W.has(J.id))return null;W.add(J.id);let U=J.parent?Q.cellsById.get(J.parent):void 0,G=U?u0(U,Q,W):null,Z=Y.x||0,K=Y.y||0,$=Z,z=K;if(G)if(Y.relative)$=G.x+Z*G.width+(Y.offset?.x||0),z=G.y+K*G.height+(Y.offset?.y||0);else $=G.x+Z,z=G.y+K;let F={x:$,y:z,width:Y.width||0,height:Y.height||0};return W.delete(J.id),Q.absoluteGeometry.set(J.id,F),F}function MJ(J,Q){let W=J.geometry;if(W?.x===void 0||W.y===void 0||W.width===void 0||W.height===void 0)return null;let Y=u0(J,Q);if(!Y)return null;return{...Y,width:W.width,height:W.height}}function T0(J){return{x:J.x+J.width/2,y:J.y+J.height/2}}function E0(J,Q){return J.x<Q.x+Q.width&&J.x+J.width>Q.x&&J.y<Q.y+Q.height&&J.y+J.height>Q.y}function A1(J,Q){return J?.split(";").map((W)=>W.split("=",2)).find(([W])=>W===Q)?.[1]}function G8(J,Q){let W=A1(J,Q);if(W===void 0)return;let Y=Number(W);return Number.isFinite(Y)?Y:void 0}function oG(J){let Q=J.replace(/<br\s*\/?\s*>/gi,`
`).replace(/&#x0*a;|&#0*10;/gi,`
`).replace(/<[^>]+>/g,"").replace(/&nbsp;|&#0*160;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').trim();return Q?Q.split(/\r?\n/):[]}function rG(J,Q,W){let Y=oG(J);if(Y.length===0)return null;let U=(K)=>Array.from(K).reduce(($,z)=>{if(/\s/u.test(z))return $+W*0.35;if(/[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/u.test(z))return $+W;if(/[A-Z0-9]/u.test(z))return $+W*0.65;if(/[a-z]/u.test(z))return $+W*0.55;return $+W*0.45},0),G=Math.max(8,...Y.map(U))+8,Z=Math.max(W*1.25,Y.length*W*1.25)+4;return{x:Q.x-G/2,y:Q.y-Z/2,width:G,height:Z}}function aG(J,Q){let W=J.slice(0,-1).map((Z,K)=>{let $=J[K+1];return{start:Z,end:$,length:Math.hypot($.x-Z.x,$.y-Z.y)}}).filter((Z)=>Z.length>0.000000001),Y=W.reduce((Z,K)=>Z+K.length,0);if(Y<=0.000000001)return null;let U=Math.min(1,Math.max(0,Q))*Y;for(let Z of W){if(U<=Z.length){let K=U/Z.length;return{point:{x:Z.start.x+(Z.end.x-Z.start.x)*K,y:Z.start.y+(Z.end.y-Z.start.y)*K},tangent:{x:(Z.end.x-Z.start.x)/Z.length,y:(Z.end.y-Z.start.y)/Z.length}}}U-=Z.length}let G=W[W.length-1];return{point:{...G.end},tangent:{x:(G.end.x-G.start.x)/G.length,y:(G.end.y-G.start.y)/G.length}}}function sG(J,Q){if(!J.label?.trim())return null;let W=Math.min(1,Math.max(-1,J.geometry?.x||0)),Y=aG(Q,(W+1)/2);if(!Y)return null;let U=J.geometry?.y||0,G={x:Y.point.x-Y.tangent.y*U+(J.geometry?.offset?.x||0),y:Y.point.y+Y.tangent.x*U+(J.geometry?.offset?.y||0)};return rG(J.label,G,G8(J.style,"fontSize")||12)}function tG(J,Q){if(!J.label?.trim())return null;let W=MJ(J,Q);if(!W)return null;if(!J.style?.split(";").includes("swimlane"))return W;let Y=Math.max(0,G8(J.style,"startSize")||23);if(A1(J.style,"horizontal")==="0")return{...W,width:Math.min(W.width,Y)};return{...W,height:Math.min(W.height,Y)}}function T1(J,Q,W){let Y=J.source?Q.get(J.source):void 0,U=J.target?Q.get(J.target):void 0,G=Y?MJ(Y,W):null,Z=U?MJ(U,W):null;if(!G||!Z)return null;let K=T0(G),$=T0(Z),z=(M,B,j,O)=>{let P=G8(J.style,j),R=G8(J.style,O);if(P!==void 0||R!==void 0)return{x:M.x+(P??0.5)*M.width,y:M.y+(R??0.5)*M.height};let T=T0(M),A=B.x-T.x,D=B.y-T.y;if(Math.abs(A)>=Math.abs(D))return{x:A>=0?M.x+M.width:M.x,y:T.y};return{x:T.x,y:D>=0?M.y+M.height:M.y}},F=z(G,$,"exitX","exitY"),X=z(Z,K,"entryX","entryY"),H=J.parent?W.cellsById.get(J.parent):void 0,V=H?u0(H,W):null,q=(J.geometry?.points||[]).map((M)=>({x:M.x+(V?.x||0),y:M.y+(V?.y||0)}));if(q.length>0)return[F,...q,X];if(J.style?.includes("edgeStyle=none"))return[F,X];if(Math.abs(X.x-F.x)>=Math.abs(X.y-F.y)){let M=(F.x+X.x)/2;return[F,{x:M,y:F.y},{x:M,y:X.y},X]}let L=(F.y+X.y)/2;return[F,{x:F.x,y:L},{x:X.x,y:L},X]}function e9(J,Q){let W=new Set,Y=J?Q.cellsById.get(J):void 0;while(Y?.parent&&!W.has(Y.parent))W.add(Y.parent),Y=Q.cellsById.get(Y.parent);return W}function eG(J,Q,W,Y){let U=(Q.x-J.x)*(Y.y-W.y)-(Q.y-J.y)*(Y.x-W.x);if(Math.abs(U)<0.000000001)return!1;let G=((W.x-J.x)*(Y.y-W.y)-(W.y-J.y)*(Y.x-W.x))/U,Z=((W.x-J.x)*(Q.y-J.y)-(W.y-J.y)*(Q.x-J.x))/U,K=0.000001;return G>K&&G<1-K&&Z>K&&Z<1-K}function J3(J,Q,W,Y){let U=Q.x-J.x,G=Q.y-J.y,Z=Y.x-W.x,K=Y.y-W.y,$=Math.hypot(U,G),z=Math.hypot(Z,K);if($<0.000001||z<0.000001)return 0;if(Math.abs(U*K-G*Z)/($*z)>0.000001)return 0;let X=U/$,H=G/$,V=(O)=>Math.abs((O.x-J.x)*H-(O.y-J.y)*X);if(V(W)>0.5||V(Y)>0.5)return 0;let q=(O)=>(O.x-J.x)*X+(O.y-J.y)*H,L=q(W),M=q(Y),B=Math.max(0,Math.min(L,M)),j=Math.min($,Math.max(L,M));return Math.max(0,j-B)}function Q3(J,Q){let W=0;for(let Y=0;Y<J.length-1;Y+=1)for(let U=0;U<Q.length-1;U+=1)W=Math.max(W,J3(J[Y],J[Y+1],Q[U],Q[U+1]));return W}function W3(J,Q,W){let U=W.x+0.0001,G=W.x+W.width-0.0001,Z=W.y+0.0001,K=W.y+W.height-0.0001;if(U>=G||Z>=K)return!1;let $=Q.x-J.x,z=Q.y-J.y,F=[-$,$,-z,z],X=[J.x-U,G-J.x,J.y-Z,K-J.y],H=0,V=1;for(let q=0;q<F.length;q+=1){if(Math.abs(F[q])<0.000000001){if(X[q]<0)return!1;continue}let L=X[q]/F[q];if(F[q]<0)H=Math.max(H,L);else V=Math.min(V,L);if(H>V)return!1}return V-H>0.0001}function r6(J,Q=90){let W=a(J),Y=W.errors.map((Z)=>({code:"invalid-structure",severity:"error",page:Z.split(":")[0]||"(unknown)",cells:[],message:Z})),U={overlaps:0,edgeNodeIntersections:0,edgeCrossings:0,edgeOverlaps:0,sharedPortCongestions:0,labelOverlaps:0,emptyLabels:0,missingLineJumps:0};for(let Z of J){let K=Z.cells.filter((B)=>B.vertex),$=Z.cells.filter((B)=>B.edge),z=new Map(K.map((B)=>[B.id,B])),F=_5(Z.cells),X=new Set(Z.cells.map((B)=>B.parent).filter((B)=>Boolean(B)));for(let B=0;B<K.length;B+=1){let j=K[B],O=MJ(j,F);if(!j.label?.trim()&&!X.has(j.id))U.emptyLabels+=1,Y.push({code:"empty-label",severity:"warning",page:Z.name,cells:[j.id],message:`${Z.name}: node ${j.id} has an empty label`});if(!O)continue;for(let P=B+1;P<K.length;P+=1){let R=K[P];if(j.parent!==R.parent)continue;let T=MJ(R,F);if(!T||!E0(O,T))continue;U.overlaps+=1,Y.push({code:"node-overlap",severity:"error",page:Z.name,cells:[j.id,R.id],message:`${Z.name}: nodes ${j.id} and ${R.id} overlap`})}}let H=new Map,V=new Map;for(let B of $){let j=T1(B,z,F);if(j){H.set(B.id,j);let P=sG(B,j);if(P)V.set(B.id,P)}if(!B.style?.includes("jumpStyle=arc"))U.missingLineJumps+=1,Y.push({code:"missing-line-jump",severity:"info",page:Z.name,cells:[B.id],message:`${Z.name}: edge ${B.id} does not enable arc line jumps`});if(!j)continue;let O=new Set([...e9(B.source,F),...e9(B.target,F)]);for(let P of K){if(P.id===B.source||P.id===B.target)continue;if(O.has(P.id))continue;let R=MJ(P,F);if(!R)continue;if(!j.slice(0,-1).some((A,D)=>W3(A,j[D+1],R)))continue;U.edgeNodeIntersections+=1,Y.push({code:"edge-through-node",severity:"error",page:Z.name,cells:[B.id,P.id],message:`${Z.name}: edge ${B.id} passes through node ${P.id}`})}}let q=new Map,L=(B)=>Math.round(B*100)/100;for(let B of $){let j=H.get(B.id);if(!j||j.length<2)continue;let O=[{role:"source",vertexId:B.source,point:j[0]},{role:"target",vertexId:B.target,point:j[j.length-1]}];for(let P of O){if(!P.vertexId)continue;let R=[P.role,P.vertexId,L(P.point.x),L(P.point.y)].join(":"),T=q.get(R)||{vertexId:P.vertexId,role:P.role,edges:[]};T.edges.push(B.id),q.set(R,T)}}for(let B of q.values()){if(B.edges.length<2)continue;U.sharedPortCongestions+=1,Y.push({code:"shared-port-congestion",severity:"error",page:Z.name,cells:[B.vertexId,...B.edges],message:`${Z.name}: ${B.edges.length} edges share the same ${B.role} port on node ${B.vertexId}`})}for(let B of $){let j=V.get(B.id);if(!j)continue;for(let O of K){let P=tG(O,F);if(!P||!E0(j,P))continue;U.labelOverlaps+=1,Y.push({code:"label-overlap",severity:"error",page:Z.name,cells:[B.id,O.id],message:`${Z.name}: label of edge ${B.id} overlaps node or container title ${O.id}`})}}let M=$.filter((B)=>V.has(B.id));for(let B=0;B<M.length;B+=1){let j=M[B],O=V.get(j.id);for(let P=B+1;P<M.length;P+=1){let R=M[P],T=V.get(R.id);if(!E0(O,T))continue;U.labelOverlaps+=1,Y.push({code:"label-overlap",severity:"error",page:Z.name,cells:[j.id,R.id],message:`${Z.name}: labels of edges ${j.id} and ${R.id} overlap`})}}for(let B=0;B<$.length;B+=1){let j=$[B],O=H.get(j.id);if(!O)continue;for(let P=B+1;P<$.length;P+=1){let R=$[P],T=H.get(R.id);if(!T)continue;let A=Q3(O,T);if(A>=8)U.edgeOverlaps+=1,Y.push({code:"edge-overlap",severity:"error",page:Z.name,cells:[j.id,R.id],message:`${Z.name}: edges ${j.id} and ${R.id} overlap for ${Math.round(A)}px`});if(!O.slice(0,-1).some((N,C)=>T.slice(0,-1).some((k,S)=>eG(N,O[C+1],k,T[S+1]))))continue;U.edgeCrossings+=1,Y.push({code:"edge-crossing",severity:"warning",page:Z.name,cells:[j.id,R.id],message:`${Z.name}: edges ${j.id} and ${R.id} cross`})}}}let G=Math.max(0,100-W.errors.length*40-U.overlaps*12-U.edgeNodeIntersections*8-U.edgeCrossings*4-U.edgeOverlaps*10-U.sharedPortCongestions*8-U.labelOverlaps*6-U.emptyLabels*2-U.missingLineJumps);return{pass:W.valid&&U.overlaps===0&&U.edgeNodeIntersections===0&&U.edgeOverlaps===0&&U.sharedPortCongestions===0&&U.labelOverlaps===0&&G>=Q,score:G,threshold:Q,metrics:U,issues:Y,validation:W}}function Y3(J,Q){let W=new Map,Y=[];for(let U of J.split(";").filter(Boolean)){let G=U.indexOf("="),Z=G===-1?U:U.slice(0,G);if(!W.has(Z))Y.push(Z);W.set(Z,G===-1?"":U.slice(G+1))}for(let[U,G]of Object.entries(Q)){if(!W.has(U))Y.push(U);W.set(U,G)}return`${Y.map((U)=>{let G=W.get(U)||"";return G?`${U}=${G}`:U}).join(";")};`}function G3(J,Q){let W=L5(J),Y=W.filter(lJ),U=Y.filter((j)=>I(j["@_parent"])==="1"),G=U.length>0?U:Y,Z=new Set(G.map(JJ)),K=W.filter((j)=>t6(j)&&Z.has(I(j["@_source"])||"")&&Z.has(I(j["@_target"])||""));if(G.length===0)return[];let $=G.map((j)=>({id:JJ(j),label:I(j["@_value"])||JJ(j)})),z=K.map((j)=>({id:JJ(j),source:I(j["@_source"])||"",target:I(j["@_target"])||""})),F=R1($,z),X=new Map;for(let j of G){let O=F.get(JJ(j))||0,P=X.get(O)||[];P.push(j),X.set(O,P)}for(let j of X.values())j.sort((O,P)=>{let R=nJ(O),T=nJ(P),A=GJ(R[Q==="left-to-right"?"@_y":"@_x"])||0,D=GJ(T[Q==="left-to-right"?"@_y":"@_x"])||0;return A-D||JJ(O).localeCompare(JJ(P))});let H=Math.max(...G.map((j)=>GJ(nJ(j)["@_width"])||160)),V=Math.max(...G.map((j)=>GJ(nJ(j)["@_height"])||70)),q=H+140,L=V+90,M=new Map,B=new Set;for(let[j,O]of[...X.entries()].sort((P,R)=>P[0]-R[0]))O.forEach((P,R)=>{let T=nJ(P),A=GJ(T["@_width"])||160,D=GJ(T["@_height"])||70,N={x:Q==="left-to-right"?80+j*q:80+R*L,y:Q==="left-to-right"?80+R*L:80+j*q,width:A,height:D};T["@_x"]=N.x,T["@_y"]=N.y,T["@_width"]=A,T["@_height"]=D,M.set(JJ(P),N),B.add(JJ(P))});for(let[j,O]of K.entries()){let P=I(O["@_source"]),R=I(O["@_target"]),T=M.get(P),A=M.get(R),D=(v)=>{let n=M.get(v);return Q==="left-to-right"?n.y+n.height/2:n.x+n.width/2},N=K.filter((v)=>I(v["@_source"])===P).sort((v,n)=>D(I(v["@_target"]))-D(I(n["@_target"]))||JJ(v).localeCompare(JJ(n))),C=N.indexOf(O),k=K.filter((v)=>I(v["@_target"])===R).sort((v,n)=>D(I(v["@_source"]))-D(I(n["@_source"]))||JJ(v).localeCompare(JJ(n))),S=k.indexOf(O),x=Y8(C,N.length),b=Y8(S,k.length),t=((N.length-1)/2-C)*18,c=nJ(O);c["@_relative"]="1",c["@_as"]="geometry";let YJ,i;if(Q==="left-to-right"){let v=T.x+T.width,n=A.x,tJ=n>v?(v+n)/2+t:Math.max(v,A.x+A.width)+80+j*18;YJ=[{x:tJ,y:T.y+T.height*x},{x:tJ,y:A.y+A.height*b}],i={exitX:"1",exitY:String(x),exitDx:"0",exitDy:"0",entryX:"0",entryY:String(b),entryDx:"0",entryDy:"0"}}else{let v=T.y+T.height,n=A.y,tJ=n>v?(v+n)/2+t:Math.max(v,A.y+A.height)+80+j*18;YJ=[{x:T.x+T.width*x,y:tJ},{x:A.x+A.width*b,y:tJ}],i={exitX:String(x),exitY:"1",exitDx:"0",exitDy:"0",entryX:String(b),entryY:"0",entryDx:"0",entryDy:"0"}}c.Array={"@_as":"points",mxPoint:YJ.map((v)=>({"@_x":v.x,"@_y":v.y}))},O["@_style"]=Y3(I(O["@_style"])||h0,{edgeStyle:"orthogonalEdgeStyle",rounded:"1",orthogonalLoop:"1",jettySize:"auto",html:"1",jumpStyle:"arc",jumpSize:"10",endArrow:"block",endFill:"1",...i}),B.add(JJ(O))}return[...B]}async function E1(J,Q,W){await y.mkdir(E.dirname(J),{recursive:!0});let Y=!1;try{Y=(await y.stat(J)).isFile()}catch(Z){if(Z.code!=="ENOENT")throw Z}if(Y&&!W)throw Error("target already exists; set overwrite=true to replace it with a recoverable backup");let U=`${J}.${process.pid}.${Date.now()}.tmp`;if(await y.writeFile(U,Q,"utf8"),!Y)return await y.rename(U,J),{backup:null};let G=`${J}.${new Date().toISOString().replace(/[:.]/g,"-")}.bak`;await y.rename(J,G);try{await y.rename(U,J)}catch(Z){throw await y.rename(G,J),Z}return{backup:G}}var N1=new Set(["svg","xmlsvg","html2"]),D1=new Set(["png","jpeg","xmlpng"]),k1=new Set(["svg","xmlsvg"]),N0=/^[A-Za-z0-9._:-]{1,120}$/;function U3(J,Q,W){let Y=F8("sha256").update(J).digest("hex").slice(0,12),U=`export-page-${Q+1}-${Y}`,G=U,Z=2;while(W.has(G))G=`${U}-${Z}`,Z+=1;return W.add(G),G}function z3(J,Q){let W=V5.parse(J),Y=W.mxfile;if(!Y)return{xml:J,pageId:Q};let U=xJ(Y.diagram),G=new Set(U.map((z)=>I(z["@_id"])).filter((z)=>Boolean(z)&&N0.test(z))),Z=new Map,K=!1;U.forEach((z,F)=>{let X=I(z["@_id"]);if(!X||N0.test(X))return;let H=U3(X,F,G);if(z["@_id"]=H,!Z.has(X))Z.set(X,H);K=!0});let $=Q;if(Q&&!N0.test(Q)){if($=Z.get(Q),!$)throw Error(`requested page ID ${JSON.stringify(Q)} was not found in the Draw.io document`)}return{xml:K?y5.build(W):J,pageId:$}}function J1(J,Q){let W=process.env[J]?.trim();if(!W)return Q;let Y=Number(W);if(!Number.isFinite(Y)||Y<=0)throw Error(`${J} must be a positive number`);return Y}function X8(){let J=process.env.DRAWIO_EXPORT_URL?.trim()||yG,Q=new URL(J);if(!["http:","https:"].includes(Q.protocol))throw Error("DRAWIO_EXPORT_URL must use http or https");return{url:Q,timeoutMs:J1("DRAWIO_REQUEST_TIMEOUT",60)*1000,maxOutputBytes:J1("DRAWIO_MAX_OUTPUT_SIZE_MB",wG/1024/1024)*1024*1024}}function S1(J){if(J==="jpeg")return".jpeg";if(J==="xmlpng")return".editable.png";if(J==="xmlsvg")return".editable.svg";if(J==="html2")return".html";return`.${J}`}function I1(J){if(J==="xmlpng")return[".editable.png",".png"];if(J==="xmlsvg")return[".editable.svg",".svg"];return[S1(J)]}function g0(J,Q,W,Y){let U=f5(J),G=W?.trim()||m(J,Q).replace(/\.(?:drawio|xml)$/i,S1(Y)),Z=Q8(J,G,I1(Y)),K=E.relative(U,Z);if(!K||E.isAbsolute(K))throw Error("output file must resolve inside the current workspace");return Z}function w1(J,Q,W,Y,U){let G=g0(J,Q,W,Y),Z=[...I1(Y)].sort(($,z)=>z.length-$.length).find(($)=>G.toLowerCase().endsWith($));if(!Z)throw Error(`cannot derive a multi-page output name for ${Y}`);let K=G.slice(0,-Z.length);return U.map(($,z)=>({page:$,pageIndex:z+1,outputTarget:`${K}.page-${z+1}-${B1($.name)}${Z}`}))}function y1(J,Q){let W=f(J).find((Y)=>Y.id===Q);if(!W)throw Error(`requested page ID ${JSON.stringify(Q)} was not found in the Draw.io document`);return W}function Z3(J,Q){y1(J,Q);let W=V5.parse(J),Y=W.mxfile;if(!Y)throw Error("Draw.io document is missing mxfile");let G=xJ(Y.diagram).find((Z)=>I(Z["@_id"])===Q);if(!G)throw Error(`requested page ID ${JSON.stringify(Q)} was not found in the Draw.io document`);return Y.diagram=G,y5.build(W)}function K3(J,Q,W){if(J.length===0)throw Error("export server returned an empty response");if(!{png:["image/png","application/octet-stream"],jpeg:["image/jpeg","application/octet-stream"],pdf:["application/pdf","application/octet-stream"],xmlpng:["image/png","image/jpg","application/octet-stream"],svg:["image/svg+xml","text/plain","application/octet-stream"],xmlsvg:["image/svg+xml","text/plain","application/octet-stream"],html2:["text/html","text/plain","application/octet-stream"]}[Q].some((G)=>W.includes(G)))throw Error(`export server returned unexpected Content-Type: ${W||"(missing)"}`);if(!(Q==="png"||Q==="xmlpng"?J.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):Q==="jpeg"?J.subarray(0,3).equals(Buffer.from([255,216,255])):Q==="pdf"?J.subarray(0,5).toString("ascii")==="%PDF-":!0))throw Error(`export server response is not a valid ${Q.toUpperCase()} file`)}function F3(J){if(typeof J!=="string")throw Error("editor export data must be a data URI string");let Q=J.match(/^data:([^;,]+)?((?:;[^,]*)*),(.*)$/s);if(!Q)throw Error("editor returned an invalid data URI");return Q[2].split(";").includes("base64")?Buffer.from(Q[3],"base64"):Buffer.from(decodeURIComponent(Q[3]),"utf8")}function X3(J,Q){if(J.length===0)throw Error("editor export returned empty content");if(Q!=="svg"&&Q!=="xmlsvg"&&Q!=="html2")throw Error(`${Q} is not an editor-channel export format`);let W=J.subarray(0,4096).toString("utf8");if(Q==="svg"||Q==="xmlsvg"){if(!W.includes("<svg"))throw Error(`editor export is not valid ${Q.toUpperCase()} content`)}else{let Y=W.toLowerCase();if(!Y.includes("<html")&&!Y.includes("<!doctype"))throw Error("editor export is not valid HTML content")}}function $3(J){if(J==="svg"||J==="xmlsvg")return"image/svg+xml";if(J==="html2")return"text/html";return"application/octet-stream"}async function $8(J,Q,W={}){let Y=X8(),U=z3(J,W.pageId),G=new URLSearchParams({format:Q==="xmlpng"?"png":Q,xml:U.xml});if(U.pageId&&!W.allPages)G.set("pageId",U.pageId);if(W.allPages)G.set("allPages","1");if(W.scale!==void 0&&W.scale!==1)G.set("scale",String(W.scale));if(W.border!==void 0&&W.border!==0)G.set("border",String(W.border));if(G.set("bg",W.background?.trim()||w0),W.embedXml)G.set("embedXml","1");let Z;try{Z=await fetch(Y.url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},body:G,redirect:"follow",signal:AbortSignal.timeout(Y.timeoutMs)})}catch(z){throw Error(`cannot reach Draw.io Export Server at ${Y.url}: ${z.message}`)}if(!Z.ok){let z="";try{z=(await Z.text()).trim().slice(0,500)}catch(F){z=`response body unavailable: ${F.message}`}throw Error(`Draw.io Export Server returned HTTP ${Z.status}${z?`: ${z}`:""}`)}let K;try{K=Buffer.from(await Z.arrayBuffer())}catch(z){throw Error(`Draw.io Export Server closed the HTTP ${Z.status} response before the export completed: ${z.message}`)}if(K.length>Y.maxOutputBytes)throw Error(`export result exceeds ${Math.floor(Y.maxOutputBytes/1024/1024)} MB`);let $=Z.headers.get("content-type")?.toLowerCase()||"";return K3(K,Q,$),{content:K,contentType:$,exportUrl:Y.url.toString()}}async function m0(J,Q,W){await y.mkdir(E.dirname(J),{recursive:!0});let Y=!1;try{Y=(await y.stat(J)).isFile()}catch(G){if(G.code!=="ENOENT")throw G}if(Y&&!W)throw Error("output already exists; set overwrite=true to replace it");let U=`${J}.${process.pid}.${Date.now()}.tmp`;if(await y.writeFile(U,Q),Y)await y.rm(J);await y.rename(U,J)}async function H3(J,Q){if(new Set(J.map((U)=>E.resolve(U.target))).size!==J.length)throw Error("multi-page export resolved duplicate output paths");let Y=[];try{for(let[G,Z]of J.entries()){await y.mkdir(E.dirname(Z.target),{recursive:!0});let K=!1;try{K=(await y.stat(Z.target)).isFile()}catch(F){if(F.code!=="ENOENT")throw F}if(K&&!Q)throw Error(`output already exists: ${Z.target}; set overwrite=true to replace it`);let $=`${process.pid}.${Date.now()}.${G}.${$1()}`,z=`${Z.target}.${$}.tmp`;await y.writeFile(z,Z.content),Y.push({target:Z.target,temporary:z,backup:K?`${Z.target}.${$}.previous`:null,existed:K})}let U=[];try{for(let G of Y){if(G.existed&&G.backup)await y.rename(G.target,G.backup);try{await y.rename(G.temporary,G.target),U.push(G)}catch(Z){if(G.existed&&G.backup)await y.rename(G.backup,G.target);throw Z}}}catch(G){for(let Z of U.reverse())if(await y.rm(Z.target,{force:!0}),Z.existed&&Z.backup)await y.rename(Z.backup,Z.target);throw G}for(let G of Y)if(G.backup)await y.rm(G.backup,{force:!0})}finally{for(let U of Y)if(await y.rm(U.temporary,{force:!0}),U.backup)try{await y.access(U.target)}catch{try{await y.rename(U.backup,U.target)}catch{}}}}async function Q1(J){let Q=g0(J.context,J.inputTarget,J.outputPath,J.format),W=await $8(J.xml,J.format,{pageId:J.pageId,allPages:J.allPages,scale:J.scale,border:J.border,background:J.background,embedXml:J.embedXml});return await m0(Q,W.content,J.overwrite),{outputTarget:Q,bytes:W.content.length,contentType:W.contentType,exportUrl:W.exportUrl}}async function V3(J){if(!D1.has(J.format))throw Error(`${J.format} is not a per-page multi-file export format`);let Q=f(J.xml),W=w1(J.context,J.inputTarget,J.outputPath,J.format,Q);if(!J.overwrite)for(let U of W)try{if((await y.stat(U.outputTarget)).isFile())throw Error(`output already exists: ${m(J.context,U.outputTarget)}; set overwrite=true to replace it`)}catch(G){if(G.code!=="ENOENT")throw G}let Y=[];for(let U of W){let G=await $8(J.xml,J.format,{pageId:U.page.id,scale:J.scale,border:J.border,background:J.background,embedXml:J.embedXml});Y.push({...U,...G})}for(let U of Y)await m0(U.outputTarget,U.content,J.overwrite);return Y.map((U)=>({pageId:U.page.id,pageName:U.page.name,pageIndex:U.pageIndex,outputTarget:U.outputTarget,bytes:U.content.length,contentType:U.contentType,exportUrl:U.exportUrl}))}async function q3(J,Q,W){let Y=Date.now();while(Date.now()-Y<W){if(U8(J,Q))return!0;await new Promise((U)=>setTimeout(U,500))}return U8(J,Q)}async function b1(J){if(!N1.has(J.format))throw Error(`${J.format} is not an editor-channel export format`);let Q=await x0(J.context,J.inputTarget),W=g0(J.context,J.inputTarget,J.outputPath,J.format);if(!await q3(Q.session.sessionId,J.inputTarget,bG)){let K=new URL("/editor",`http://${Q.bridge.host}:${Q.bridge.port}`);return K.searchParams.set("sessionId",Q.session.sessionId),K.searchParams.set("token",Q.token),{status:"editor_required",openUrl:K.toString(),tokenExpiresAt:new Date(Date.now()+B6).toISOString()}}let U=_(),G=`export_${$1()}`,Z=X8().timeoutMs;return await new Promise((K,$)=>{let z=setTimeout(()=>{U.pendingEditorExports.delete(G),$(Error(`editor export timed out after ${Math.round(Z/1000)}s; make sure the built-in browser editor page is open and responsive, then retry`))},Z);U.pendingEditorExports.set(G,{requestId:G,sessionId:Q.session.sessionId,diagramKey:u(Q.session.file),format:J.format,outputTarget:W,overwrite:J.overwrite,writeOutput:J.writeOutput!==!1,resolve:(F)=>K({status:"exported",...F,sourceRevision:J.sourceRevision}),reject:$,timer:z}),R3(Q.session,{action:"export",requestId:G,format:J.format,pageId:J.pageId,allPages:J.allPages===!0,xml:J.xml,sourceRevision:J.sourceRevision})})}async function L3(J){if(!k1.has(J.format))throw Error(`${J.format} is not an editor per-page multi-file export format`);let Q=f(J.xml),W=w1(J.context,J.inputTarget,J.outputPath,J.format,Q);if(!J.overwrite)for(let U of W)try{if((await y.stat(U.outputTarget)).isFile())throw Error(`output already exists: ${m(J.context,U.outputTarget)}; set overwrite=true to replace it`)}catch(G){if(G.code!=="ENOENT")throw G}let Y=[];for(let U of W){let G=await b1({context:J.context,inputTarget:J.inputTarget,format:J.format,outputPath:m(J.context,U.outputTarget),xml:J.xml,pageId:U.page.id,sourceRevision:J.sourceRevision,writeOutput:!1,overwrite:J.overwrite});if(G.status==="editor_required")return G;if(!G.content)throw Error("editor export completed without buffered content");Y.push({...U,content:G.content,contentType:G.contentType})}return await H3(Y.map((U)=>({target:U.outputTarget,content:U.content})),J.overwrite),{status:"exported",sourceRevision:J.sourceRevision,outputs:Y.map((U)=>({pageId:U.page.id,pageName:U.page.name,pageIndex:U.pageIndex,outputTarget:U.outputTarget,bytes:U.content.length,contentType:U.contentType}))}}async function B3(){let J=X8(),Q=Number(J.url.port||(J.url.protocol==="https:"?443:80));return new Promise((W)=>{let Y=IG({host:J.url.hostname,port:Q}),U=setTimeout(()=>{Y.destroy(),W({reachable:!1,error:"connection timed out"})},Math.min(J.timeoutMs,5000));Y.once("connect",()=>{clearTimeout(U),Y.end(),W({reachable:!0})}),Y.once("error",(G)=>{clearTimeout(U),W({reachable:!1,error:G.message})})})}async function j3(J){let Q=[],W=0;for await(let Y of J){let U=Buffer.isBuffer(Y)?Y:Buffer.from(Y);if(W+=U.length,W>q5)throw Error(`request body exceeds ${q5/1024/1024} MB`);Q.push(U)}return Buffer.concat(Q).toString("utf8")}async function _1(J,Q){let W=`${J}.${process.pid}.${Date.now()}.tmp`,Y=`${J}.${process.pid}.${Date.now()}.rollback`;await y.writeFile(W,Q,"utf8"),await y.rename(J,Y);try{await y.rename(W,J),await y.rm(Y,{force:!0})}catch(U){throw await y.rm(J,{force:!0}),await y.rename(Y,J),U}}function M3(J,Q){let W;try{W=new URL(J)}catch{throw Error(`${Q} must be an absolute http:// or https:// URL`)}if(!["http:","https:"].includes(W.protocol)||W.username||W.password)throw Error(`${Q} must be an http:// or https:// URL without credentials`);return W.hash="",W}function _0(J){let Q=M3(J,"drawio_url");if(Q.searchParams.set("embed","1"),Q.searchParams.set("proto","json"),Q.searchParams.set("spin","1"),Q.searchParams.set("libraries","1"),Q.searchParams.set("saveAndExit","0"),Q.searchParams.set("noSaveBtn","0"),Q.searchParams.set("offline","1"),Q.protocol==="http:")Q.searchParams.set("https","0");return Q}function P3(J){return JSON.stringify(J).replace(/[<>&\u2028\u2029]/g,(Q)=>{return`\\u${Q.charCodeAt(0).toString(16).padStart(4,"0")}`})}var ZJ=globalThis;function _(){if(!ZJ.__drawioIntegratedBridge)ZJ.__drawioIntegratedBridge={server:null,startPromise:null,host:"127.0.0.1",port:0,sessions:new Map,tokens:new Map,eventClients:new Map,pendingEditorExports:new Map,writeQueues:new Map,annotationWriteQueues:new Map,annotationsByDiagram:new Map,historyWriteQueues:new Map,historyDebounce:new Map,previewInFlight:new Map,previewActive:0,previewWaiters:[],patchPreviews:new Map,approvalReviews:new Map,questionReviewIds:new Map};return ZJ.__drawioIntegratedBridge.writeQueues||=new Map,ZJ.__drawioIntegratedBridge.pendingEditorExports||=new Map,ZJ.__drawioIntegratedBridge.annotationWriteQueues||=new Map,ZJ.__drawioIntegratedBridge.annotationsByDiagram||=new Map,ZJ.__drawioIntegratedBridge.historyWriteQueues||=new Map,ZJ.__drawioIntegratedBridge.historyDebounce||=new Map,ZJ.__drawioIntegratedBridge.previewInFlight||=new Map,ZJ.__drawioIntegratedBridge.previewActive||=0,ZJ.__drawioIntegratedBridge.previewWaiters||=[],ZJ.__drawioIntegratedBridge.patchPreviews||=new Map,ZJ.__drawioIntegratedBridge.approvalReviews||=new Map,ZJ.__drawioIntegratedBridge.questionReviewIds||=new Map,ZJ.__drawioIntegratedBridge}function s(J){return F8("sha256").update(J,"utf8").digest("hex")}function l(J){return typeof J==="object"&&J!==null&&!Array.isArray(J)}function O3(J){return J==="editor"?"editor":"agent"}function c0(J){if(J==="selection_and_edges"||J==="surrounding_layout"||J==="diagram_wide")return J;return"selection_only"}function hJ(J){if(J==="diagram_wide")return"\u5141\u8BB8\u4FEE\u6539\u6574\u4E2A\u56FE\u8868";if(J==="selection_and_edges")return"\u5141\u8BB8\u8C03\u6574\u5173\u8054\u8FDE\u7EBF";if(J==="surrounding_layout")return"\u5141\u8BB8\u8C03\u6574\u5468\u8FB9\u5E03\u5C40";return"\u53EA\u4FEE\u6539\u9009\u533A"}function W1(J){if(J==="diagram_wide")return 3;if(J==="selection_and_edges")return 1;if(J==="surrounding_layout")return 2;return 0}function p0(J){if(J.history.push({revision:J.revision,xml:J.xml,updatedBy:J.updatedBy,updatedAt:J.updatedAt}),J.history.length>i9)J.history.splice(0,J.history.length-i9)}function e6(J,Q){let W=J.history.find((Y)=>Y.revision===Q);if(!W)return{available:!1,reason:"base revision is no longer in the in-memory history"};try{return{available:!0,fromRevision:Q,toRevision:J.revision,diff:X5(f(W.xml),f(J.xml))}}catch(Y){return{available:!1,reason:`unable to calculate revision diff: ${Y.message}`}}}async function p(J){let Q=await jJ(J.file),W=s(Q);if(W!==J.fileHash){let Z=f(Q),K=a(Z);if(!K.valid)throw Error(`workspace file changed to invalid Draw.io XML: ${JSON.stringify(K.errors)}`)}let{fileHash:Y,revision:U}=J,G=await H8(J,W);if(W===Y&&G.ledger.revision===U)return J;if(W!==Y)p0(J);if(J.revision=G.ledger.revision,J.xml=Q,J.fileHash=W,J.updatedBy=G.ledger.updatedBy,J.updatedAt=G.ledger.updatedAt,J.revisionWarning=null,s0(J.file,null),d0(J),G.advancedExternally)await gJ(J,{source:"external",xml:Q,sessionRevision:J.revision});return J}function wJ(J,Q){let W=J.sessionID?.trim();if(!W)return null;let Y=_().sessions.get(W);if(!Y||E.resolve(Y.file)!==E.resolve(Q))return null;return Y}function a6(J,Q){if(Q?.trim())return wJ(J,RJ(J,Q));return _().sessions.get(J.sessionID)||null}async function L6(J,Q,W,Y,U=null,G={}){let Z=_(),K=E.resolve(J.file).toLowerCase(),z=(Z.writeQueues.get(K)||Promise.resolve()).catch(()=>{return}).then(async()=>{let F=Q,X=null;if(await p(J),W!==J.revision){let M=e6(J,W);if(G.autoMerge){let B=J.history.find((O)=>O.revision===W),j=B?lG(B.xml,Q,J.xml):{status:"unavailable",reason:"base revision is no longer in memory"};if(j.status==="merged"){if(F=j.xml,X={status:"merged",fromRevision:W,ontoRevision:J.revision,localChangedKeys:j.localChangedKeys,remoteChangedKeys:j.remoteChangedKeys},j.localChangedKeys.length===0||s(F)===J.fileHash)return{conflict:!1,document:J,validation:a(f(J.xml)),autoMerge:X}}else return{conflict:!0,current:J,manualChanges:M,merge:j}}else return{conflict:!0,current:J,manualChanges:M,merge:null}}let H=f(F),V=a(H);if(!V.valid)return{invalid:!0,report:V};let q=s(F),L=await x1(J,q,Y);p0(J);try{if(!J.backupFile){let M=await E1(J.file,F,!0);J.backupFile=M.backup}else await _1(J.file,F)}catch(M){try{let B=await jJ(J.file);await H8(J,s(B))}catch(B){console.warn(`diagram revision recovery failed for ${J.file}: ${B.message}`)}throw M}J.revision=L.revision,J.xml=F,J.fileHash=q,J.updatedBy=Y,J.updatedAt=L.updatedAt,J.revisionWarning=null;try{await h1(J,L)}catch(M){J.revisionWarning=`diagram revision finalization pending: ${M.message}`,console.warn(`${J.revisionWarning} for ${J.file}`)}if(s0(J.file,G.appliedPreviewId||null),d0(J,U),Y==="agent")try{await gJ(J,{source:"agent",xml:F,sessionRevision:J.revision})}catch(M){console.warn(`history snapshot record failed for ${J.file}: ${M.message}`)}else f3(J);return{conflict:!1,document:J,validation:V,autoMerge:X}});return Z.writeQueues.set(K,z),z.catch(()=>{return}).finally(()=>{if(Z.writeQueues.get(K)===z)Z.writeQueues.delete(K)}),z}function C3(J){let W=new URL(J.url||"/",`http://${J.headers.host||"localhost"}`).searchParams.get("token")||"",Y=_().tokens.get(W);if(!Y||Y.expiresAt<=Date.now())return _().tokens.delete(W),null;let U=_().sessions.get(Y.sessionId);if(!U)return null;if(u(U.file)!==Y.diagramKey)return null;if(U.bindingId!==Y.bindingId)return null;return Y.expiresAt=Date.now()+B6,{sessionKey:W,session:U}}function w(J,Q,W){J.writeHead(Q,{"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"}),J.end(JSON.stringify(W))}async function H6(J){let Q=await j3(J),W=JSON.parse(Q);if(!l(W))throw Error("request body must be a JSON object");return W}function KJ(J){return{sessionId:J.sessionId,file:E.relative(J.workspace,J.file).split(E.sep).join("/"),revision:J.revision,xml:J.xml,updatedBy:J.updatedBy,updatedAt:J.updatedAt,revisionScope:"diagram",revisionWarning:J.revisionWarning,backup:J.backupFile?E.relative(J.workspace,J.backupFile).split(E.sep).join("/"):null}}function d0(J,Q=null){let W=`event: diagram\\ndata: ${JSON.stringify({revision:J.revision,updatedBy:J.updatedBy,updatedAt:J.updatedAt,clientId:Q})}

`,Y=u(J.file),U=_();for(let G of U.sessions.values()){if(u(G.file)!==Y)continue;for(let Z of U.eventClients.get(G.sessionId)||[])if(Z.diagramKey===Y)Z.response.write(W)}}function U8(J,Q){let W=u(Q);return[..._().eventClients.get(J)||[]].some((Y)=>Y.diagramKey===W)}function R3(J,Q){let W=`event: editor-command
data: ${JSON.stringify(Q)}

`,Y=u(J.file);[..._().eventClients.get(J.sessionId)||[]].find((G)=>G.diagramKey===Y)?.response.write(W)}function Y1(J){return E.join(J,".mobilework","drawio-history","v1")}function A3(J){return F8("sha256").update(J.replace(/\\/g,"/"),"utf8").digest("hex").slice(0,12)}function WJ(J){let Q=E.relative(J.workspace,J.file).split(E.sep).join("/");return`${E.basename(J.file)}--${A3(Q)}`}function G1(J){return E.join(J,".mobilework","drawio-state","v1")}function f1(J){return C6(G1(J.workspace),E.join(G1(J.workspace),WJ(J),"state.json"))}function v1(J){return["editor","agent","external","initial","restore"].includes(String(J))}function T3(J){return l(J)&&Number.isInteger(J.fromRevision)&&J.fromRevision>=0&&Number.isInteger(J.revision)&&J.revision>J.fromRevision&&typeof J.contentHash==="string"&&/^[a-f0-9]{64}$/.test(J.contentHash)&&v1(J.updatedBy)&&typeof J.updatedAt==="string"}function E3(J){if(!l(J)||J.schemaVersion!==L1)return!1;if(!l(J.file))return!1;if(typeof J.file.relativePath!=="string"||typeof J.file.pathKey!=="string")return!1;if(!Number.isInteger(J.revision)||J.revision<0)return!1;if(typeof J.contentHash!=="string"||!/^[a-f0-9]{64}$/.test(J.contentHash))return!1;if(!v1(J.updatedBy)||typeof J.updatedAt!=="string")return!1;return J.pendingTransition===null||T3(J.pendingTransition)}async function l0(J){let Q=f1(J),W;try{W=await y.readFile(Q,"utf8")}catch(G){if(G.code==="ENOENT")return null;throw G}let Y;try{Y=JSON.parse(W)}catch(G){throw Error(`diagram revision state for ${WJ(J)} is corrupted: ${G.message}`)}if(!E3(Y))throw Error(`diagram revision state for ${WJ(J)} failed schema validation`);let U=E.relative(J.workspace,J.file).split(E.sep).join("/");if(Y.file.relativePath!==U||Y.file.pathKey!==WJ(J))throw Error(`diagram revision state for ${WJ(J)} is bound to another diagram`);return Y}async function $5(J,Q){let W=f1(J);await y.mkdir(E.dirname(W),{recursive:!0});let Y=`${W}.${process.pid}.${Date.now()}.${vJ(4).toString("hex")}.tmp`;await y.writeFile(Y,JSON.stringify(Q,null,2),"utf8"),await y.rename(Y,W)}async function N3(J){try{let Q=await uJ(J);if(!Q)return 0;return Q.entries.reduce((W,Y)=>Math.max(W,Y.sequence,Y.sessionRevision),0)}catch{return 0}}async function H8(J,Q){let W=await l0(J);if(!W){let Y=new Date().toISOString();return W={schemaVersion:L1,file:{relativePath:E.relative(J.workspace,J.file).split(E.sep).join("/"),pathKey:WJ(J)},revision:await N3(J),contentHash:Q,updatedBy:"initial",updatedAt:Y,pendingTransition:null},await $5(J,W),{ledger:W,advancedExternally:!1}}if(W.pendingTransition){let Y=W.pendingTransition;if(Q===Y.contentHash)return W={...W,revision:Y.revision,contentHash:Y.contentHash,updatedBy:Y.updatedBy,updatedAt:Y.updatedAt,pendingTransition:null},await $5(J,W),{ledger:W,advancedExternally:!1};if(Q===W.contentHash)return W={...W,pendingTransition:null},await $5(J,W),{ledger:W,advancedExternally:!1};let U=new Date().toISOString();return W={...W,revision:Math.max(W.revision,Y.revision)+1,contentHash:Q,updatedBy:"external",updatedAt:U,pendingTransition:null},await $5(J,W),{ledger:W,advancedExternally:!0}}if(W.contentHash!==Q)return W={...W,revision:W.revision+1,contentHash:Q,updatedBy:"external",updatedAt:new Date().toISOString()},await $5(J,W),{ledger:W,advancedExternally:!0};return{ledger:W,advancedExternally:!1}}async function x1(J,Q,W){let Y=await l0(J);if(!Y)throw Error("diagram revision state is missing; re-open the diagram");if(Y.pendingTransition)throw Error("diagram revision state has an unfinished transition; re-read the diagram state");if(Y.revision!==J.revision||Y.contentHash!==J.fileHash)throw Error("diagram revision state changed; re-read the diagram state");let U={fromRevision:Y.revision,revision:Y.revision+1,contentHash:Q,updatedBy:W,updatedAt:new Date().toISOString()};return await $5(J,{...Y,pendingTransition:U}),U}async function h1(J,Q){let W=await l0(J);if(!W?.pendingTransition||W.pendingTransition.fromRevision!==Q.fromRevision||W.pendingTransition.revision!==Q.revision||W.pendingTransition.contentHash!==Q.contentHash)throw Error("diagram revision transition no longer matches the prepared write");await $5(J,{...W,revision:Q.revision,contentHash:Q.contentHash,updatedBy:Q.updatedBy,updatedAt:Q.updatedAt,pendingTransition:null})}function C6(J,Q){let W=E.resolve(Q),Y=E.resolve(J);if(W!==Y&&!W.startsWith(Y+E.sep))throw Error("history path escapes the history directory");return W}function sJ(J){return C6(Y1(J.workspace),E.join(Y1(J.workspace),WJ(J)))}function n0(J){return E.join(sJ(J),"manifest.json")}function i0(J,Q){if(!j6.test(Q))throw Error("invalid snapshot id");return C6(sJ(J),E.join(sJ(J),"snapshots",`${Q}.drawio`))}function u1(J){let Q=String(J).replace(/[^A-Za-z0-9_-]/g,"_").slice(0,120);if(!Q)throw Error("invalid page id");return Q}function g1(J,Q,W,Y){if(!j6.test(Q))throw Error("invalid snapshot id");let U=u1(W),G=Y==="preview"?`${U}-preview.png`:`${U}-thumb.png`;return C6(sJ(J),E.join(sJ(J),"previews",Q,G))}function D3(J){if(!l(J))return!1;if(typeof J.id!=="string"||!j6.test(J.id))return!1;if(!Number.isInteger(J.sequence))return!1;if(typeof J.createdAt!=="string")return!1;if(!["initial","editor","agent","external","restore"].includes(J.source))return!1;if(J.sessionId!==null&&typeof J.sessionId!=="string")return!1;if(!Number.isInteger(J.sessionRevision))return!1;if(typeof J.contentHash!=="string")return!1;if(J.parentSnapshotId!==null&&typeof J.parentSnapshotId!=="string")return!1;if(J.restoredFromSnapshotId!==null&&typeof J.restoredFromSnapshotId!=="string")return!1;if(!Array.isArray(J.pages))return!1;for(let Q of J.pages)if(!l(Q)||typeof Q.id!=="string"||typeof Q.name!=="string")return!1;if(!["pending","ready","failed","unavailable"].includes(J.previewState))return!1;return!0}function k3(J){if(!l(J))return!1;if(J.schemaVersion!==q1)return!1;if(!l(J.file))return!1;if(typeof J.file.relativePath!=="string"||typeof J.file.pathKey!=="string")return!1;if(!Number.isInteger(J.nextSequence)||J.nextSequence<1)return!1;if(!Array.isArray(J.entries))return!1;for(let Q of J.entries)if(!D3(Q))return!1;return!0}async function uJ(J){let Q=n0(J),W;try{W=await y.readFile(Q,"utf8")}catch(U){if(U.code==="ENOENT")return null;throw U}let Y;try{Y=JSON.parse(W)}catch(U){throw Error(`history manifest for ${WJ(J)} is corrupted: ${U.message}`)}if(!k3(Y))throw Error(`history manifest for ${WJ(J)} failed schema validation`);return Y}async function m1(J,Q){if(V8("manifest"))throw Error("injected history manifest write failure");let W=n0(J);await y.mkdir(E.dirname(W),{recursive:!0});let Y=`${W}.${process.pid}.${Date.now()}.tmp`;await y.writeFile(Y,JSON.stringify(Q,null,2),"utf8"),await y.rename(Y,W)}function V8(J){return globalThis.__drawioHistoryFaults?.[J]===!0}function S3(){return`h_${new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z")}_${vJ(4).toString("hex")}`}function f0(J){if(J==="editor"||J==="agent"||J==="external"||J==="initial"||J==="restore")return J;return"initial"}function z8(J,Q,W){let Y=`event: history
data: ${JSON.stringify({kind:Q,...W})}

`,U=u(J.file);for(let G of _().eventClients.get(J.sessionId)||[])if(G.diagramKey===U)G.response.write(Y)}function c1(J){return E.resolve(sJ(J)).toLowerCase()}function p1(J,Q){let W=_(),U=(W.historyWriteQueues.get(J)||Promise.resolve()).catch(()=>{return}).then(Q);return W.historyWriteQueues.set(J,U),U.catch(()=>{return}).finally(()=>{if(W.historyWriteQueues.get(J)===U)W.historyWriteQueues.delete(J)}),U}async function I3(J,Q){try{for(let W of Q){await y.rm(i0(J,W),{force:!0});let Y=C6(sJ(J),E.join(sJ(J),"previews",W));await y.rm(Y,{recursive:!0,force:!0})}}catch(W){console.warn(`history cleanup failed for ${WJ(J)}: ${W.message}`)}}function w3(J){let Q=[];while(J.entries.length>_G){let W=J.entries.shift();if(W)Q.push(W.id)}return Q}async function gJ(J,Q){return p1(c1(J),async()=>{let W=await uJ(J)||{schemaVersion:q1,file:{relativePath:E.relative(J.workspace,J.file).split(E.sep).join("/"),pathKey:WJ(J)},nextSequence:1,entries:[]},Y=s(Q.xml),U=f(Q.xml).map((X)=>({id:X.id,name:X.name})),G=W.entries[W.entries.length-1]||null;if(!Q.force&&G&&G.contentHash===Y)return{created:!1,snapshot:G};let Z=S3(),K={id:Z,sequence:W.nextSequence,createdAt:new Date().toISOString(),source:Q.source,sessionId:Q.sessionId??J.sessionId,sessionRevision:Q.sessionRevision??J.revision,contentHash:Y,parentSnapshotId:G?G.id:null,restoredFromSnapshotId:Q.restoredFromSnapshotId??null,pages:U,previewState:"pending"},$=i0(J,Z);if(V8("snapshotXml"))throw Error("injected snapshot xml write failure");await y.mkdir(E.dirname($),{recursive:!0});let z=`${$}.${process.pid}.${Date.now()}.tmp`;await y.writeFile(z,Q.xml,"utf8"),await y.rename(z,$),W.entries.push(K),W.nextSequence+=1;let F=w3(W);if(await m1(J,W),F.length>0)I3(J,F);if(U.length>0)_3(J,K.id,U[0].id,"thumb");for(let X of F)z8(J,"snapshot-evicted",{snapshotId:X});return z8(J,"snapshot-created",{snapshotId:K.id,sequence:K.sequence,source:K.source}),{created:!0,snapshot:K}})}async function U1(J,Q,W){await p1(c1(J),async()=>{let Y=await uJ(J);if(!Y)return;let U=Y.entries.find((G)=>G.id===Q);if(!U)return;U.previewState=W,await m1(J,Y)})}async function o0(J,Q,W){let Y=await y.readFile(i0(J,Q),"utf8");if(Buffer.byteLength(Y,"utf8")>q5)throw Error("snapshot exceeds the size limit");if(W&&s(Y)!==W)throw Error("snapshot content hash mismatch");return Y}async function y3(){let J=_();while(J.previewActive>=vG)await new Promise((Q)=>J.previewWaiters.push(Q));J.previewActive+=1}function b3(){let J=_();J.previewActive-=1;let Q=J.previewWaiters.shift();if(Q)Q()}async function d1(J,Q,W,Y){let U=_(),G=`${Q}|${u1(W)}|${Y}`,Z=U.previewInFlight.get(G);if(Z)return Z;let K=(async()=>{await y3();try{let z=(await uJ(J))?.entries.find((L)=>L.id===Q);if(!z)throw Error("snapshot not found in preview");let F=await o0(J,Q,z.contentHash);if(!f(F).find((L)=>L.id===W))throw Error("page not found in snapshot");let H=await $8(F,"png",{pageId:W,scale:Y==="thumb"?xG:1,background:"#ffffff"});if(H.content.length>hG)throw Error("preview exceeds the size limit");let V=g1(J,Q,W,Y);await y.mkdir(E.dirname(V),{recursive:!0});let q=`${V}.${process.pid}.${Date.now()}.tmp`;if(await y.writeFile(q,H.content),await y.rename(q,V),Y==="thumb")await U1(J,Q,"ready");return z8(J,"preview-ready",{snapshotId:Q,pageId:W,mode:Y}),H.content}catch($){if(Y==="thumb")await U1(J,Q,"failed");throw z8(J,"preview-failed",{snapshotId:Q,pageId:W,mode:Y,error:$.message}),$}finally{b3(),U.previewInFlight.delete(G)}})();return U.previewInFlight.set(G,K),K}function _3(J,Q,W,Y){d1(J,Q,W,Y).catch(()=>{return})}function f3(J){let Q=_(),W=WJ(J),Y=Q.historyDebounce.get(W);if(Y)clearTimeout(Y.timer);let U=setTimeout(()=>{l1(J.sessionId,W).catch((G)=>console.warn(`editor history checkpoint failed for ${J.file}: ${G.message}`))},fG);if(typeof U.unref==="function")U.unref();Q.historyDebounce.set(W,{timer:U,sessionId:J.sessionId,revision:J.revision,hash:J.fileHash})}async function l1(J,Q){let W=_(),Y=W.historyDebounce.get(Q);if(Y)clearTimeout(Y.timer),W.historyDebounce.delete(Q);if(!Y)return;let U=W.sessions.get(J);if(!U)return;if(U.revision!==Y.revision||U.fileHash!==Y.hash)return;await gJ(U,{source:"editor",xml:U.xml,sessionRevision:Y.revision})}async function n1(J){await l1(J.sessionId,WJ(J))}async function i1(J){try{let Q=n0(J),W=new Date().toISOString().replace(/[:.]/g,"-");await y.rename(Q,`${Q}.corrupt-${W}`),console.warn(`quarantined corrupt history manifest for ${WJ(J)} to ${E.basename(Q)}.corrupt-${W}`)}catch(Q){if(Q.code!=="ENOENT")console.warn(`unable to quarantine corrupt history manifest for ${WJ(J)}: ${Q.message}`)}}async function v3(J){let Q=await uJ(J),W=Q&&Q.entries.length>0?Q.entries[Q.entries.length-1]:null;if(!W){await gJ(J,{source:f0(J.updatedBy),xml:J.xml,sessionRevision:J.revision});return}if(W.contentHash!==J.fileHash)await gJ(J,{source:f0(J.updatedBy),xml:J.xml,sessionRevision:J.revision})}async function x3(J){let Q=null;try{Q=await uJ(J)}catch(Y){J.historyWarning=`history re-initialized: previous manifest was corrupted (${Y.message})`,console.warn(`${J.historyWarning} for ${WJ(J)}`),await i1(J);return}let W=Q&&Q.entries.length>0?Q.entries[Q.entries.length-1]:null;try{if(!W)await gJ(J,{source:"initial",xml:J.xml,sessionRevision:J.revision});else if(W.contentHash!==J.fileHash)await gJ(J,{source:"external",xml:J.xml,sessionRevision:J.revision})}catch(Y){J.historyWarning=`history disabled: ${Y.message}`,console.warn(`${J.historyWarning} for ${WJ(J)}`)}}async function h3(J,Q,W,Y){let U=_(),G=E.resolve(J.file).toLowerCase(),K=(U.writeQueues.get(G)||Promise.resolve()).catch(()=>{return}).then(async()=>{if(await p(J),W!==J.revision)return{conflict:!0,current:J};let $=await uJ(J);if(!$)return{invalid:!0,error:"snapshot_not_found"};let z=$.entries.find((B)=>B.id===Q);if(!z)return{invalid:!0,error:"snapshot_not_found"};if(V8("preRestoreCheckpoint"))return{checkpointFailed:!0,error:"injected pre-restore checkpoint failure"};try{await n1(J),await gJ(J,{source:f0(J.updatedBy),xml:J.xml,sessionRevision:J.revision})}catch(B){return{checkpointFailed:!0,error:`pre-restore checkpoint failed: ${B.message}`}}let F;try{F=await o0(J,z.id,z.contentHash)}catch(B){if(B.code==="ENOENT")return{invalid:!0,error:"snapshot_not_found"};return{invalid:!0,error:`snapshot_damaged: ${B.message}`}}let X;try{X=a(f(F))}catch(B){return{invalid:!0,error:`snapshot_damaged: ${B.message}`}}if(!X.valid)return{invalid:!0,error:`snapshot_damaged: ${JSON.stringify(X.errors)}`};if(z.contentHash===J.fileHash)return{invalid:!0,error:"current_snapshot"};let H=s(F),V=await x1(J,H,"restore");try{await _1(J.file,F)}catch(B){try{let j=await jJ(J.file);await H8(J,s(j))}catch(j){console.warn(`diagram revision recovery failed for ${J.file}: ${j.message}`)}throw B}p0(J),J.revision=V.revision,J.xml=F,J.fileHash=H,J.updatedBy="restore",J.updatedAt=V.updatedAt,J.revisionWarning=null;try{await h1(J,V)}catch(B){J.revisionWarning=`diagram revision finalization pending: ${B.message}`,console.warn(`${J.revisionWarning} for ${J.file}`)}s0(J.file,null);let q=null;try{await u3(J)}catch(B){q=`diagram restored, but annotation invalidation could not be persisted: ${B.message}`,console.warn(q)}try{d0(J,Y)}catch(B){console.warn(`diagram revision broadcast failed: ${B.message}`)}let L=z.sequence,M;try{M=await gJ(J,{source:"restore",xml:F,sessionRevision:J.revision,restoredFromSnapshotId:z.id,force:!0})}catch(B){return{partFailed:!0,document:J,message:q?`${q} restore snapshot also failed: ${B.message}`:`diagram restored, but the restore snapshot could not be recorded: ${B.message}`}}if(!M.created||!M.snapshot)return{partFailed:!0,document:J,message:q?q:"diagram restored, but the restore snapshot could not be recorded"};return{ok:!0,document:J,snapshot:M.snapshot,restoredFromSequence:L,annotationInvalidationWarning:q}});return U.writeQueues.set(G,K),K.catch(()=>{return}).finally(()=>{if(U.writeQueues.get(G)===K)U.writeQueues.delete(G)}),K}async function u3(J){let Q=u(J.file);for(let W of _().sessions.values()){if(u(W.file)!==Q)continue;for(let Y of W.annotationAuthorizations.values()){if(!Y.previewId)continue;let U=_().patchPreviews.get(Y.previewId);if(U)R6(W,U,"\u5173\u8054\u7684\u6807\u6CE8\u5BA1\u6279\u5DF2\u5931\u6548")}W.annotationAuthorizations.clear(),W.activeAnnotationId=null}}function o1(J){return`${J.file.replace(/\.(drawio|xml)$/i,"")}.annotations.json`}function u(J){let Q=E.resolve(J);return process.platform==="win32"?Q.toLowerCase():Q}function VJ(J){let Q=_(),W=u(J.file),Y=Q.annotationsByDiagram.get(W);if(!Y)Y=new Map,Q.annotationsByDiagram.set(W,Y);return Y}async function g3(J){if(J.workspace===void 0)return;let Q=VJ(J);if(Q.size>0)return;let W;try{W=await y.readFile(o1(J),"utf8")}catch(G){if(G.code!=="ENOENT")throw G;return}let Y;try{Y=JSON.parse(W)}catch{return}let U=Array.isArray(Y)?Y:l(Y)&&Array.isArray(Y.annotations)?Y.annotations:[];for(let G of U){if(!l(G)||typeof G.id!=="string")continue;let Z=n3(G,J);if(Z)Q.set(Z.id,Z)}}function iJ(J,Q=!1){return{id:J.id,file:J.file,pageId:J.pageId,baseRevision:J.baseRevision,candidateHash:J.candidateHash,changedIds:J.changedIds,changedQualifiedIds:J.changedQualifiedIds,affectedPageIds:J.affectedPageIds,diff:J.diff,summary:J.diff.summary,status:J.status,statusReason:J.statusReason,approvedAt:J.approvedAt,consumedAt:J.consumedAt,createdAt:J.createdAt,expiresAt:new Date(J.expiresAt).toISOString(),...Q?{xml:J.comparePreviewXml,beforePreviewXml:J.beforePreviewXml,afterPreviewXml:J.candidateXml,candidateXml:J.candidateXml,comparePreviewXml:J.comparePreviewXml}:{}}}function B5(J,Q){let W=_().sessions.get(J.sessionId);if(!W||u(W.file)!==J.diagramKey)return;let Y=`event: preview
data: ${JSON.stringify({kind:Q,preview:iJ(J)})}

`;for(let U of _().eventClients.get(J.sessionId)||[])if(U.diagramKey===J.diagramKey)U.response.write(Y)}function r0(J=Date.now()){let Q=_();for(let[W,Y]of Q.approvalReviews){if(Y.expiresAt<=J&&!["consumed","cancelled","feedback","stale"].includes(Y.status))Y.status="stale",Y.resolvedAt=new Date(J).toISOString();if(Y.resolvedAt&&Date.parse(Y.resolvedAt)+o9<=J){for(let U of Y.requestIds)Q.questionReviewIds.delete(U);Q.approvalReviews.delete(W)}}for(let[W,Y]of Q.patchPreviews){let U=Y.terminalAt;if(U!==null&&U+o9<=J)Q.patchPreviews.delete(W)}}function Z8(J){let Q=_();for(let W of J.requestIds)Q.questionReviewIds.delete(W)}function v0(J,Q,W){if(!J.approvalReviewId)return;let U=_().approvalReviews.get(J.approvalReviewId);if(!U||["consumed","cancelled","feedback","stale"].includes(U.status))return;U.status=Q,U.feedback=W,U.resolvedAt=new Date().toISOString(),Z8(U)}function TJ(J){if(r0(),!J.activePreviewId)return null;let Q=_().patchPreviews.get(J.activePreviewId);if(!Q||Q.sessionId!==J.sessionId||Q.diagramKey!==u(J.file))return J.activePreviewId=null,null;if((Q.status==="pending"||Q.status==="authorized")&&Q.expiresAt<=Date.now())Q.status="stale",Q.statusReason="\u9884\u89C8\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u57FA\u4E8E\u6700\u65B0\u56FE\u8868\u91CD\u65B0\u751F\u6210",Q.approvalToken=null,Q.terminalAt=Date.now(),J.activePreviewId=null,v0(Q,"stale",Q.statusReason),B5(Q,"stale");else if((Q.status==="pending"||Q.status==="authorized")&&(Q.baseRevision!==J.revision||Q.baseFileHash!==J.fileHash))Q.status="stale",Q.statusReason=`\u56FE\u8868\u5DF2\u4ECE revision ${Q.baseRevision} \u66F4\u65B0\u5230 ${J.revision}`,Q.approvalToken=null,Q.terminalAt=Date.now(),J.activePreviewId=null,v0(Q,"stale",Q.statusReason),B5(Q,"stale");return Q}function R6(J,Q,W){if(Q.status==="applied"||Q.status==="cancelled")return;if(Q.status="cancelled",Q.statusReason=W,Q.approvalToken=null,Q.terminalAt=Date.now(),v0(Q,"cancelled",W),J.activePreviewId===Q.id)J.activePreviewId=null;B5(Q,"cancelled")}function I5(J,Q,W,Y,U,G){if(Q.includes(AJ)||W.includes(AJ))throw Error("formal Draw.io XML must not contain reserved preview artifacts");let Z=TJ(J);if(Z&&(Z.status==="pending"||Z.status==="authorized"))R6(J,Z,"\u5DF2\u751F\u6210\u65B0\u7684\u4FEE\u6539\u9884\u89C8");let K=`prv_${vJ(9).toString("base64url")}`,$=new Date().toISOString(),z=[...new Set([...G.added.map((V)=>V.key),...G.removed.map((V)=>V.key),...G.changed.map((V)=>V.key),...G.pageChanges.map((V)=>`${V.pageId}:@page`)])],F=[...new Set([...G.added.map((V)=>rJ(V.key,V.cell.id)),...G.removed.map((V)=>rJ(V.key,V.cell.id)),...G.changed.map((V)=>V.pageId),...G.pageChanges.map((V)=>V.pageId)])].filter(Boolean),X=l3(Q,W,G,K),H={id:K,sessionId:J.sessionId,diagramKey:u(J.file),file:E.relative(J.workspace,J.file).split(E.sep).join("/"),pageId:Y,baseRevision:J.revision,baseFileHash:J.fileHash,candidateXml:W,candidateHash:s(W),beforePreviewXml:Q,comparePreviewXml:X,changedIds:[...new Set(U.length>0?U:[...G.added.map((V)=>V.cell.id),...G.removed.map((V)=>V.cell.id),...G.changed.map((V)=>V.cellId),...G.pageChanges.map(()=>"@page")])],changedQualifiedIds:z,affectedPageIds:F,diff:G,status:"pending",statusReason:null,approvalToken:null,approvedAt:null,consumedAt:null,approvalReviewId:null,createdAt:$,expiresAt:Date.now()+V1,terminalAt:null};return _().patchPreviews.set(K,H),J.activePreviewId=K,B5(H,"created"),H}function m3(J,Q,W){let Y=TJ(J);if(!Y||Y.id!==Q.id)throw Error("patch preview is no longer active");if(Q.status!=="pending")throw Error(`patch preview is ${Q.status}; generate a fresh dry-run preview`);Q.status="authorized",Q.statusReason=null,Q.approvalToken=W,Q.approvedAt=new Date().toISOString(),B5(Q,"authorized")}function D0(J,Q,W,Y){let U=Q?_().patchPreviews.get(Q)||null:TJ(J);if(!U){if(Q)throw Error("patch preview not found for this session and diagram");return null}if(U.sessionId!==J.sessionId||U.diagramKey!==u(J.file))throw Error("patch preview not found for this session and diagram");if(TJ(J),U.status!=="pending"&&U.status!=="authorized"){if(!Q)return null;throw Error(`patch preview is ${U.status}; generate a fresh preview`)}if(U.baseRevision!==W||U.candidateHash!==s(Y)){if(Q)throw Error("formal write does not match the requested preview candidate or revision");return null}return U}function k0(J){let Q=J.diff.summary;return`Apply the visible Draw.io candidate: ${Q.added} added, ${Q.removed} removed, ${Q.changed} changed.`}var K8="\u786E\u8BA4\u4FEE\u6539",a0="\u53D6\u6D88\u4FEE\u6539";function c3(J){let Q=J.requestedScope?`\uFF1B\u8303\u56F4\uFF1A${hJ(J.requestedScope)}`:"",W=J.proposedChangedIds.length>0?`\uFF1B\u53D8\u66F4 ID\uFF1A${J.proposedChangedIds.join(", ")}`:"";return{header:J.kind==="annotation"?"\u6279\u6CE8\u4FEE\u6539\u5BA1\u6279":"\u56FE\u8868\u4FEE\u6539\u5BA1\u6279",question:`\u5DF2\u5728 Draw.io \u753B\u5E03\u5C55\u793A\u5019\u9009\u4FEE\u6539\uFF0C\u662F\u5426\u6279\u51C6\u5199\u5165 ${J.baseRevision} \u53F7\u7248\u672C\uFF1F`+`
\u8BA1\u5212\uFF1A${J.plan}${Q}${W}`+`
\u5BA1\u6279\u7F16\u53F7\uFF1A${J.id}`,options:[{label:K8,description:"\u4EC5\u6279\u51C6\u5F53\u524D\u753B\u5E03\u4E2D\u4E0E\u8BE5\u5BA1\u6279\u7F16\u53F7\u7ED1\u5B9A\u7684\u5019\u9009\u4FEE\u6539\u3002"},{label:a0,description:"\u4E0D\u5199\u5165\u5F53\u524D\u5019\u9009\u5E76\u4F7F\u672C\u6B21\u9884\u89C8\u5931\u6548\u3002"}],multiple:!1,custom:!0}}function p3(J,Q){return s(JSON.stringify({kind:Q.kind,previewId:J.id,baseRevision:J.baseRevision,candidateHash:J.candidateHash,plan:Q.plan.trim(),annotationId:Q.annotationId||null,requestedScope:Q.requestedScope||null,proposedChangedIds:[...Q.proposedChangedIds||[]].toSorted(),escalationReason:Q.escalationReason?.trim()||null}))}function d3(J,Q,W){if(Q.status!=="pending")throw Error(`patch preview is ${Q.status}; generate a fresh preview`);r0();let Y=_();if(Q.approvalReviewId){let $=Y.approvalReviews.get(Q.approvalReviewId);if($)return $}let U=p3(Q,W),G=`rev_${vJ(12).toString("base64url")}`,Z={id:G,fingerprint:U,kind:W.kind,sessionId:J.sessionId,diagramKey:Q.diagramKey,previewId:Q.id,baseRevision:Q.baseRevision,candidateHash:Q.candidateHash,plan:W.plan.trim(),annotationId:W.annotationId||null,requestedScope:W.requestedScope||null,proposedChangedIds:[...W.proposedChangedIds||[]],escalationReason:W.escalationReason?.trim()||null,requestIds:[],status:"awaiting_question",feedback:null,createdAt:new Date().toISOString(),expiresAt:Math.min(Q.expiresAt,Date.now()+V1),resolvedAt:null},K={...Z,question:c3(Z)};return Y.approvalReviews.set(G,K),Q.approvalReviewId=G,K}function z1(J){let Q=J.status==="feedback"?"feedback_received":J.status==="cancelled"?"cancelled":J.status==="stale"?"stale":J.status==="waiting_for_user"?"question_pending":"question_required";return{ok:!1,applied:!1,approvalRequired:Q==="question_required",status:Q,reviewId:J.id,previewId:J.previewId,baseRevision:J.baseRevision,candidateHash:J.candidateHash,...J.feedback?{userFeedback:J.feedback}:{},...Q==="question_required"?{question:{tool:"question",arguments:{questions:[J.question]}},guidance:"Call OpenCode's built-in question tool with exactly the returned arguments. After the user answers, call the same Draw.io authorization or formal-write tool again with approval_review_id set to reviewId and approval_answer set to the exact returned answer. Do not invent, summarize, or answer the question yourself."}:Q==="question_pending"?{guidance:"The OpenCode question is already active. Do not ask it again. If the Agent already received the user's answer, retry this same Draw.io tool with approval_review_id set to reviewId and approval_answer set to that exact answer. Otherwise wait for the user's answer.",diagnostic:"question_answer_not_forwarded_or_pending"}:Q==="feedback_received"?{guidance:"The user supplied revision feedback instead of approving. Do not write this candidate. Regenerate the candidate preview from the latest revision, then request a new question review."}:{guidance:"The candidate was not approved. Do not write it; generate a new preview before trying again."}}}function V6(J,Q,W,Y={}){let U=d3(J,Q,W),G=Y.reviewId!==void 0,Z=Y.answer!==void 0;if(G!==Z)throw Error("approval_review_id and approval_answer must be provided together after the OpenCode question returns");if(G&&Z){if(Y.reviewId!==U.id)throw Error("approval_review_id does not match the review bound to this preview");if(U.status==="awaiting_question"||U.status==="waiting_for_user"){let K=Y.answer.trim();if(U.resolvedAt=new Date().toISOString(),Z8(U),K===K8)U.status="approved",U.feedback=null;else if(!K||K===a0)U.status="cancelled",U.feedback=null;else U.status="feedback",U.feedback=K}else if(U.status==="approved"&&Y.answer.trim()!==K8)throw Error("approval_answer conflicts with the answer already recorded for this review")}if(U.status==="approved"){if(U.sessionId!==J.sessionId||U.diagramKey!==u(J.file)||U.previewId!==Q.id||U.baseRevision!==J.revision||U.candidateHash!==Q.candidateHash)return U.status="stale",U.feedback="\u56FE\u8868\u7248\u672C\u6216\u5019\u9009\u5185\u5BB9\u5DF2\u53D8\u5316",U.resolvedAt=new Date().toISOString(),{approved:!1,payload:z1(U),review:U};let K=vJ(24).toString("base64url");return m3(J,Q,K),U.status="consumed",U.resolvedAt=new Date().toISOString(),Z8(U),{approved:!0,approvalToken:K,review:U}}if(U.status==="cancelled"||U.status==="feedback"||U.status==="stale")R6(J,Q,U.status==="feedback"?"\u7528\u6237\u63D0\u51FA\u4E86\u65B0\u7684\u4FEE\u6539\u610F\u89C1":"\u7528\u6237\u672A\u6279\u51C6\u8BE5\u4FEE\u6539\u9884\u89C8");return{approved:!1,payload:z1(U),review:U}}function q6(J,Q,W,Y,U){if(!Q)throw Error("preview_id is required for an active-session write; create a dry-run preview first");let G=_().patchPreviews.get(Q);if(!G||G.sessionId!==J.sessionId||G.diagramKey!==u(J.file))throw Error("patch preview not found for this session and diagram");if(TJ(J),G.status!=="authorized")throw Error(`patch preview is ${G.status}; approve the visible preview before writing`);if(!W||G.approvalToken!==W)throw Error("patch preview approval token is missing or invalid");if(G.consumedAt)throw Error("patch preview approval token has already been used");if(G.baseRevision!==Y||G.baseRevision!==J.revision)throw Error("patch preview revision no longer matches the active diagram");if(G.candidateHash!==s(U))throw Error("formal write does not match the candidate XML shown in the preview");return G}function s0(J,Q){let W=_(),Y=u(J),U=Date.now();for(let G of W.patchPreviews.values()){if(G.diagramKey!==Y||G.status!=="pending"&&G.status!=="authorized")continue;let Z=W.sessions.get(G.sessionId);if(G.id===Q){if(G.status="applied",G.statusReason=null,G.consumedAt=new Date(U).toISOString(),G.terminalAt=U,Z?.activePreviewId===G.id)Z.activePreviewId=null;B5(G,"applied")}else{if(G.status="stale",G.statusReason="\u56FE\u8868\u5DF2\u88AB\u5176\u5B83\u4FEE\u6539\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u751F\u6210\u9884\u89C8",G.approvalToken=null,G.terminalAt=U,Z?.activePreviewId===G.id)Z.activePreviewId=null;B5(G,"stale")}}}function r1(J,Q){let W=J?.trim()||"";return`${W}${W&&!W.endsWith(";")?";":""}${Q}`}function rJ(J,Q){return J.slice(0,Math.max(0,J.length-Q.length-1))}function s6(J,Q,W,Y,U="",G=!1){let Z=G?0:6;return{"@_id":J,"@_value":U,"@_style":["rounded=1","whiteSpace=wrap","html=1",`fillColor=${G?Y:"none"}`,`strokeColor=${Y}`,`strokeWidth=${G?3:4}`,"dashed=1",`opacity=${G?28:80}`,`fontColor=${Y}`,"fontStyle=1","movable=0","resizable=0","editable=0","deletable=0","connectable=0","pointerEvents=0","shadow=0"].join(";")+";","@_vertex":"1","@_parent":Q,mxGeometry:{"@_x":String(W.x-Z),"@_y":String(W.y-Z),"@_width":String(Math.max(1,W.width+Z*2)),"@_height":String(Math.max(1,W.height+Z*2)),"@_as":"geometry"}}}function Z1(J,Q,W,Y,U=85){let G=JSON.parse(JSON.stringify(J));return G["@_id"]=Q,G["@_parent"]=W,G["@_value"]="",G["@_style"]=r1(I(G["@_style"]),`strokeColor=${Y};strokeWidth=4;opacity=${U};dashed=1;movable=0;editable=0;deletable=0;pointerEvents=0;`),G}function l3(J,Q,W,Y){let U=f(J),G=f(Q),Z=H5(J),K=H5(Q),$=new Map(U.map((j)=>[j.id,j])),z=new Map(G.map((j)=>[j.id,j])),F=new Map(Z.pages.map((j)=>[j.id,j])),X=new Map(K.pages.map((j)=>[j.id,j])),H=new Map(W.changed.map((j)=>[j.key,j])),V=new Set(W.added.map((j)=>j.key)),q=new Set(W.removed.map((j)=>j.key)),L=0;for(let[j,O]of X){let P=$.get(j),R=z.get(j);if(!R)continue;if(!(W.added.some((b)=>rJ(b.key,b.cell.id)===j)||W.removed.some((b)=>rJ(b.key,b.cell.id)===j)||W.changed.some((b)=>b.key.startsWith(`${j}:`))))continue;let A=L5(O),D=`${AJ}layer_${Y}_${L++}`;A.push({"@_id":D,"@_value":"AI \u4FEE\u6539\u9884\u89C8\uFF08\u4E34\u65F6\uFF09","@_parent":"0"});let N=new Map(A.map((b)=>[JJ(b),b])),C=_5(R.cells),k=P?_5(P.cells):null,S=new Map((P?.cells||[]).map((b)=>[b.id,b])),x=new Map(R.cells.map((b)=>[b.id,b]));for(let b of R.cells){if(!b.vertex&&!b.edge)continue;let t=`${j}:${b.id}`,c=N.get(b.id);if(V.has(t)){if(b.vertex){let i=MJ(b,C);if(i)A.push(s6(`${AJ}added_${Y}_${L++}`,D,i,"#22c55e"))}else if(c)A.push(Z1(c,`${AJ}added_edge_${Y}_${L++}`,D,"#22c55e"));continue}let YJ=H.get(t);if(!YJ)continue;if(b.vertex){let i=MJ(b,C);if(i)A.push(s6(`${AJ}changed_${Y}_${L++}`,D,i,"#f59e0b"));let v=S.get(b.id);if(v&&k&&JSON.stringify(YJ.before.geometry)!==JSON.stringify(YJ.after.geometry)){let n=MJ(v,k);if(n)A.push(s6(`${AJ}old_${Y}_${L++}`,D,n,"#ef4444","\u539F\u4F4D\u7F6E",!0))}}else if(c)A.push(Z1(c,`${AJ}changed_edge_${Y}_${L++}`,D,"#3b82f6"))}if(P&&k){let b=F.get(j),t=new Map(b?L5(b).map((c)=>[JJ(c),c]):[]);for(let c of P.cells){let YJ=`${j}:${c.id}`;if(!q.has(YJ))continue;if(c.vertex){let i=MJ(c,k);if(i)A.push(s6(`${AJ}removed_${Y}_${L++}`,D,i,"#ef4444",`\u5220\u9664\uFF1A${c.label?.trim()||c.id}`,!0));continue}if(c.edge&&c.source&&c.target&&x.has(c.source)&&x.has(c.target)){let i=t.get(c.id);if(!i)continue;let v=JSON.parse(JSON.stringify(i));v["@_id"]=`${AJ}removed_edge_${Y}_${L++}`,v["@_parent"]=D,v["@_value"]=c.label?`\u5220\u9664\uFF1A${c.label}`:"",v["@_style"]=r1(I(v["@_style"]),"strokeColor=#ef4444;strokeWidth=4;opacity=45;dashed=1;movable=0;editable=0;deletable=0;"),A.push(v)}}}}let M=M6(K),B=a(f(M));if(!B.valid)throw Error(`generated preview XML is invalid: ${JSON.stringify(B.errors)}`);return M}async function P6(J){let Q=_(),W=u(J.file),U=(Q.annotationWriteQueues.get(W)||Promise.resolve()).catch(()=>{return}).then(async()=>{if(V8("annotationsFile"))throw Error("injected annotation sidecar write failure");let Z=[...VJ(J).values()].map((F)=>({id:F.id,file:F.file,pageId:F.pageId,pageName:F.pageName,cells:F.cells,region:F.region,instruction:F.instruction,scope:F.scope,status:F.status,baseRevision:F.baseRevision,baseFileHash:F.baseFileHash,baseCellHashes:F.baseCellHashes,result:F.result,createdAt:F.createdAt,updatedAt:F.updatedAt,resolvedAt:F.resolvedAt,ignoredAt:F.ignoredAt,ignoredReason:F.ignoredReason})),K={schemaVersion:3,file:E.relative(J.workspace,J.file).split(E.sep).join("/"),annotations:Z},$=o1(J),z=`${$}.${process.pid}.${Date.now()}.tmp`;await y.writeFile(z,JSON.stringify(K,null,2),"utf8"),await y.rename(z,$)});Q.annotationWriteQueues.set(W,U);try{await U}finally{if(Q.annotationWriteQueues.get(W)===U)Q.annotationWriteQueues.delete(W)}}function n3(J,Q){let W=Array.isArray(J.cells)?J.cells.filter((G)=>l(G)&&typeof G.id==="string").map((G)=>({id:String(G.id),kind:G.kind==="edge"?"edge":"node",label:typeof G.label==="string"?G.label:"",source:typeof G.source==="string"?G.source:void 0,target:typeof G.target==="string"?G.target:void 0})):[],Y=l(J.region)&&typeof J.region.x==="number"?{x:Number(J.region.x),y:Number(J.region.y),width:Number(J.region.width),height:Number(J.region.height)}:null,U=J.status==="resolved"||J.status==="ignored"?J.status:"open";return{id:String(J.id),file:E.relative(Q.workspace,Q.file).split(E.sep).join("/"),pageId:typeof J.pageId==="string"?String(J.pageId):"",pageName:typeof J.pageName==="string"?String(J.pageName):"",cells:W,region:Y,instruction:typeof J.instruction==="string"?String(J.instruction):"",scope:c0(J.scope),status:U,baseRevision:Number.isInteger(J.baseRevision)?Number(J.baseRevision):0,baseFileHash:typeof J.baseFileHash==="string"?String(J.baseFileHash):"",baseCellHashes:l(J.baseCellHashes)?Object.fromEntries(Object.entries(J.baseCellHashes).filter((G)=>typeof G[1]==="string")):{},result:l(J.result)&&typeof J.result.summary==="string"?{summary:String(J.result.summary),changedIds:Array.isArray(J.result.changedIds)?J.result.changedIds.map((G)=>String(G)):[],revision:Number.isInteger(J.result.revision)?Number(J.result.revision):0,updatedAt:typeof J.result.updatedAt==="string"?String(J.result.updatedAt):""}:null,createdAt:typeof J.createdAt==="string"?String(J.createdAt):new Date().toISOString(),updatedAt:typeof J.updatedAt==="string"?String(J.updatedAt):new Date().toISOString(),resolvedAt:typeof J.resolvedAt==="string"?String(J.resolvedAt):null,ignoredAt:typeof J.ignoredAt==="string"?String(J.ignoredAt):null,ignoredReason:typeof J.ignoredReason==="string"?String(J.ignoredReason):null}}function i3(J,Q,W){let Y=J.find((X)=>X.id===Q||!Q);if(!Y)return null;let U=_5(Y.cells),G=U.cellsById,Z=Number.POSITIVE_INFINITY,K=Number.POSITIVE_INFINITY,$=Number.NEGATIVE_INFINITY,z=Number.NEGATIVE_INFINITY,F=!1;for(let X of W){let H=G.get(X);if(!H)continue;let V=null;if(H.vertex)V=MJ(H,U);else if(H.edge){let q=T1(H,G,U);if(q&&q.length>0){let{POSITIVE_INFINITY:L,POSITIVE_INFINITY:M,NEGATIVE_INFINITY:B,NEGATIVE_INFINITY:j}=Number;for(let O of q)L=Math.min(L,O.x),M=Math.min(M,O.y),B=Math.max(B,O.x),j=Math.max(j,O.y);V={x:L,y:M,width:B-L,height:j-M}}}if(!V)continue;F=!0,Z=Math.min(Z,V.x),K=Math.min(K,V.y),$=Math.max($,V.x+V.width),z=Math.max(z,V.y+V.height)}if(!F)return null;return{x:Z,y:K,width:$-Z,height:z-K}}function o3(J,Q,W){let Y=J.find((G)=>G.id===Q||!Q);if(!Y)return{};let U=new Map(Y.cells.map((G)=>[G.id,G]));return Object.fromEntries(W.flatMap((G)=>{let Z=U.get(G);return Z?[[`${Y.id}:${G}`,s(JSON.stringify(oJ(Z)))]]:[]}))}function a1(J,Q){return J.x<=Q.x+Q.width&&J.x+J.width>=Q.x&&J.y<=Q.y+Q.height&&J.y+J.height>=Q.y}function s1(J,Q,W){let Y=f(J.xml),U=Q.pageId?Y.find((H)=>H.id===Q.pageId):Y[0];if(!U)throw Error(`annotation page not found: ${Q.pageId||"(first page)"}`);let G=new Map(U.cells.map((H)=>[H.id,H])),Z=new Set(Q.cells.map((H)=>H.id)),K=new Set(Q.cells.filter((H)=>G.get(H.id)?.vertex).map((H)=>H.id)),$=new Set(Z),z=new Set,F=new Set(K),X=null;if(W==="selection_and_edges"){for(let H of U.cells)if(H.edge&&(H.source&&K.has(H.source)||H.target&&K.has(H.target)))$.add(H.id)}if(W==="surrounding_layout"){let H=_5(U.cells);if(Q.region){let q=Math.max(160,Math.min(320,Math.max(Q.region.width,Q.region.height)));X={x:Q.region.x-q,y:Q.region.y-q,width:Q.region.width+q*2,height:Q.region.height+q*2};for(let L of U.cells){if(!L.vertex)continue;let M=MJ(L,H);if(M&&a1(X,M))F.add(L.id)}}for(let q of Q.cells){let L=G.get(q.id);if(!L?.edge)continue;if(L.source)F.add(L.source);if(L.target)F.add(L.target)}let V=new Set(F);for(let q of U.cells){if(!q.edge||!q.source||!q.target)continue;if(V.has(q.source)||V.has(q.target))F.add(q.source),F.add(q.target)}for(let q of F)$.add(q);for(let q of U.cells){if(!q.edge)continue;if(Z.has(q.id)||q.source&&q.target&&F.has(q.source)&&F.has(q.target))$.add(q.id)}}if(W==="diagram_wide"){for(let H of Y)for(let V of H.cells)if(V.vertex||V.edge)z.add(`${H.id}:${V.id}`)}return{pages:Y,page:U,selectedIds:Z,selectedNodeIds:K,allowedIds:$,allowedQualifiedIds:z,allowedVertexIds:F,expandedRegion:X}}function t1(J){let Q=J.activeAnnotationId;if(!Q)return null;let W=VJ(J).get(Q);if(!W||W.status!=="open")return J.annotationAuthorizations.delete(Q),J.activeAnnotationId=null,null;return W}function S0(J,Q,W){let Y=t1(J);if(!Y){if(Q)throw Error(`annotation ${Q} is not active; restore or resolution invalidated its approval. Re-read the annotation and latest state with drawio_get_annotation, then request approval again before writing`);return null}if(!Q||Q!==Y.id)throw Error(`annotation ${Y.id} is active; formal writes require its annotation_id and a pre-approved approval_token`);let U=J.annotationAuthorizations.get(Y.id);if(!U||!W||U.approvalToken!==W)throw Error("annotation change has not been approved; complete the OpenCode question review returned by drawio_authorize_annotation_change before writing");if(U.consumedAt)throw Error("annotation approval token has already been used; request approval again before another write");if(U.sessionId!==J.sessionId||U.diagramKey!==u(J.file))throw Error("annotation approval belongs to a different diagram session; request approval again");if(U.baseRevision!==J.revision)throw Error(`annotation approval was granted for revision ${U.baseRevision}, but current revision is ${J.revision}; re-read, re-plan and request approval again`);return{task:Y,authorization:U,scope:s1(J,Y,U.scope)}}function K1(J,Q,W,Y){let{task:U,authorization:G,scope:Z}=J,K=new Set(G.proposedChangedIds),$=new Set(W.filter((z)=>z.type==="add-node").map((z)=>z.id));for(let z of W){let F=G.scope==="diagram_wide"?`${Q}:${z.id}`:z.id;if(!K.has(F))throw Error(`annotation scope violation: ${F} was not disclosed in the approved change plan`);if(G.scope==="diagram_wide")continue;if(Z.allowedIds.has(z.id))continue;if(G.scope==="selection_and_edges"&&z.type==="add-edge"){if(z.source&&Z.selectedNodeIds.has(z.source)||z.target&&Z.selectedNodeIds.has(z.target))continue}if(G.scope==="surrounding_layout"&&z.type==="add-node"){if(!Z.expandedRegion||z.x===void 0||z.y===void 0)throw Error(`annotation scope violation: new node ${z.id} needs explicit x/y inside the approved surrounding region`);let X={x:z.x,y:z.y,width:z.width||160,height:z.height||70};if(a1(Z.expandedRegion,X))continue}if(G.scope==="surrounding_layout"&&z.type==="add-edge"){let X=!!z.source&&(Z.allowedVertexIds.has(z.source)||$.has(z.source)),H=!!z.target&&(Z.allowedVertexIds.has(z.target)||$.has(z.target));if(X&&H)continue}throw Error(`annotation scope violation: ${z.id} is outside "${hJ(G.scope)}" for ${U.id}; explain the need and request a wider approval before changing it`)}for(let z of Y){let F=G.scope==="diagram_wide"?`${Q}:${z}`:z;if(!K.has(F))throw Error(`annotation scope violation: actual change ${F} was not disclosed in the approved plan`);if(G.scope==="diagram_wide")continue;let X=$.has(z)||W.some((H)=>H.type==="add-edge"&&H.id===z);if(!Z.allowedIds.has(z)&&!X)throw Error(`annotation scope violation: actual change ${z} is outside the approved boundary`)}}function r3(J,Q,W){let Y=X5(Q,W),U=`${J.task.pageId}:`,G=[...[...Y.added,...Y.removed,...Y.changed].map(($)=>$.key),...Y.pageChanges.map(($)=>`${$.pageId}:@page`)],Z=J.authorization.scope==="diagram_wide"?G:G.map(($)=>$.startsWith(U)?$.slice(U.length):$),K=new Set(J.authorization.proposedChangedIds);for(let $ of Z){if(!K.has($))throw Error(`annotation scope violation: actual change ${$} was not disclosed in the approved plan`);if(!(J.authorization.scope==="diagram_wide"?J.scope.allowedQualifiedIds.has($)||K.has($):J.scope.allowedIds.has($)))throw Error(`annotation scope violation: full-XML update changes ${$} outside "${hJ(J.authorization.scope)}"; use scoped drawio_patch or request wider approval`)}return[...new Set(Z)]}async function I0(J,Q){Q.authorization.consumedAt=new Date().toISOString(),Q.task.updatedAt=Q.authorization.consumedAt,await P6(J),O6(J,Q.task,"updated")}function F1(J,Q,W,Y=!1){let U=s1(J,Q,W.scope);return{ok:!0,annotationId:Q.id,approvalToken:W.approvalToken,previewId:W.previewId,baseRevision:W.baseRevision,requestedScope:W.scope,requestedScopeLabel:hJ(W.scope),originalScope:Q.scope,originalScopeLabel:hJ(Q.scope),escalationReason:W.escalationReason,proposedChangedIds:W.proposedChangedIds,allowedExistingIds:W.scope==="diagram_wide"?[...U.allowedQualifiedIds]:[...U.allowedIds],alreadyAuthorized:Y,guidance:"Approval is valid for one formal write at this exact revision. Pass annotation_id and approval_token to drawio_patch or drawio_update_state. Any undeclared or out-of-scope stable ID is rejected."}}function a3(J,Q){if(Q.status!=="open")return{stale:!1};if(Q.baseFileHash&&Q.baseFileHash===J.fileHash)return{stale:!1};if(!Q.baseFileHash&&Q.baseRevision>=J.revision)return{stale:!1};if(Q.cells.length===0)return{stale:!1};let W=J.history.find((U)=>U.revision===Q.baseRevision),Y=W&&(!Q.baseFileHash||s(W.xml)===Q.baseFileHash)?W:void 0;try{let U=Y?f(Y.xml):[],G=f(J.xml),Z=(X)=>X.id===Q.pageId,K=U.find(Z),$=G.find(Z);if(!$)return{stale:!0,reason:`page "${Q.pageName||Q.pageId}" no longer exists in the latest revision`};let z=K?new Map(K.cells.map((X)=>[X.id,X])):new Map,F=new Map($.cells.map((X)=>[X.id,X]));for(let X of Q.cells){let H=z.get(X.id),V=F.get(X.id);if(!V)return{stale:!0,reason:`selected cell "${X.id}" was deleted since the annotation was created`};let q=Q.baseCellHashes[`${Q.pageId}:${X.id}`];if(q&&s(JSON.stringify(oJ(V)))!==q)return{stale:!0,reason:`selected cell "${X.id}" changed since the annotation was created`};if(!q&&H&&JSON.stringify(oJ(H))!==JSON.stringify(oJ(V)))return{stale:!0,reason:`selected cell "${X.id}" changed since the annotation was created`};if(!q&&!H&&((X.label||"")!==(V.label||"")||(X.source||"")!==(V.source||"")||(X.target||"")!==(V.target||"")))return{stale:!0,reason:`selected cell "${X.id}" changed since the annotation was created`}}}catch{}return{stale:!1}}function w5(J,Q){if(Q.status!=="open")return{status:Q.status,effectiveStatus:Q.status,freshness:"fresh",requiresConfirmation:!1};let W=a3(J,Q);return{status:"open",effectiveStatus:W.stale?"stale":"open",freshness:W.stale?"stale":"fresh",requiresConfirmation:W.stale,staleReason:W.stale?W.reason:void 0}}function e1(J,Q){if(Q==="all")return!0;if(Q==="pending"||Q==="open")return J.status==="open";if(Q==="fresh")return J.status==="open"&&J.freshness==="fresh";if(Q==="resolved")return J.status==="resolved";if(Q==="ignored")return J.status==="ignored";if(Q==="stale")return J.status==="open"&&J.freshness==="stale";return!1}function JQ(J){let Q={pending:0,open:0,fresh:0,stale:0,resolved:0,ignored:0,all:J.length};for(let W of J)if(W.status==="open")Q.pending+=1,Q.open+=1,Q[W.freshness]+=1;else Q[W.status]+=1;return Q}function aJ(J,Q,W=w5(J,Q)){let Y=J.annotationAuthorizations.get(Q.id)||null;return{id:Q.id,file:Q.file,page:{id:Q.pageId,name:Q.pageName},cells:Q.cells,region:Q.region,instruction:Q.instruction,scope:Q.scope,scopeLabel:hJ(Q.scope),authorization:Y?{scope:Y.scope,scopeLabel:hJ(Y.scope),plan:Y.plan,proposedChangedIds:Y.proposedChangedIds,escalationReason:Y.escalationReason,baseRevision:Y.baseRevision,approvedAt:Y.approvedAt,consumedAt:Y.consumedAt}:null,status:W.status,effectiveStatus:W.effectiveStatus,freshness:W.freshness,requiresConfirmation:W.requiresConfirmation,stale:W.freshness==="stale",staleReason:W.staleReason||null,baseRevision:Q.baseRevision,currentRevision:J.revision,result:Q.result,createdAt:Q.createdAt,updatedAt:Q.updatedAt,resolvedAt:Q.resolvedAt,ignoredAt:Q.ignoredAt,ignoredReason:Q.ignoredReason}}function O6(J,Q,W){let Y=_(),U=u(J.file);for(let G of Y.sessions.values()){if(u(G.file)!==U)continue;let Z=`event: annotation\\ndata: ${JSON.stringify({kind:W,annotation:aJ(G,Q)})}

`,K=u(G.file);for(let $ of Y.eventClients.get(G.sessionId)||[])if($.diagramKey===K)$.response.write(Z)}}function J8(J,Q){let W=u(J.file);for(let Y of _().sessions.values()){if(u(Y.file)!==W)continue;let U=Y.annotationAuthorizations.get(Q);if(U?.previewId){let G=_().patchPreviews.get(U.previewId);if(G)R6(Y,G,"\u5173\u8054\u7684\u6807\u6CE8\u4EFB\u52A1\u5DF2\u7ED3\u675F")}if(Y.annotationAuthorizations.delete(Q),Y.activeAnnotationId===Q)Y.activeAnnotationId=null}}function s3(J,Q,W,Y){let U=Q?J.find(($)=>$.id===Q):J[0];if(U)return U;if(!/^\d+$/u.test(Q))return null;let G=Number(Q);if(!Number.isSafeInteger(G)||G<0)return null;let Z=J[G];if(!Z)return null;if(W&&W!==Z.name)return null;let K=new Set(Z.cells.map(($)=>$.id));if(Y.some(($)=>!K.has($.id)))return null;return Z}function t3(J){let Q=new URL("/api/diagram",J.bridgeUrl);Q.searchParams.set("sessionId",J.session.sessionId),Q.searchParams.set("token",J.token);let W=new URL("/api/events",J.bridgeUrl);W.searchParams.set("sessionId",J.session.sessionId),W.searchParams.set("token",J.token),W.searchParams.set("file",E.relative(J.session.workspace,J.session.file).split(E.sep).join("/"));let Y=new URL("/api/annotations",J.bridgeUrl);Y.searchParams.set("sessionId",J.session.sessionId),Y.searchParams.set("token",J.token);let U=new URL("/api/history",J.bridgeUrl);U.searchParams.set("sessionId",J.session.sessionId),U.searchParams.set("token",J.token);let G=new URL("/api/preview",J.bridgeUrl);G.searchParams.set("sessionId",J.session.sessionId),G.searchParams.set("token",J.token);let Z=new URL("/api/editor-export",J.bridgeUrl);Z.searchParams.set("sessionId",J.session.sessionId),Z.searchParams.set("token",J.token);let K=P3({file:E.relative(J.session.workspace,J.session.file).split(E.sep).join("/"),drawioUrl:J.editorUrl.toString(),drawioOrigin:J.editorUrl.origin,apiUrl:Q.toString(),eventsUrl:W.toString(),annotationsUrl:Y.toString(),historyUrl:U.toString(),patchPreviewUrl:G.toString(),editorExportUrl:Z.toString()});return`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Draw.io - ${yJ(E.basename(J.session.file))}</title>
  <style>
    html, body, iframe { width: 100%; height: 100%; margin: 0; border: 0; overflow: hidden; }
    body { background: #f8fafc; font: 13px system-ui, sans-serif; }
    #status { position: fixed; z-index: 4; left: 12px; bottom: 10px; padding: 6px 9px;
      border-radius: 8px; background: rgba(15, 23, 42, .88); color: white; opacity: 0;
      pointer-events: none; transition: opacity .15s; }
    #status.visible { opacity: 1; }
    #patch-preview-bar { --preview-accent: #d97706; --preview-ink: #172033; --preview-muted: #64748b;
      position: fixed; z-index: 11; top: 12px; left: 50%; transform: translateX(-50%);
      box-sizing: border-box; width: min(920px, calc(100vw - 24px)); display: none;
      grid-template-columns: minmax(220px, 1fr) auto;
      grid-template-areas: "overview actions" "meta meta"; align-items: center; gap: 9px 18px;
      padding: 11px 14px 10px; border: 1px solid rgba(148,163,184,.54);
      border-top: 3px solid var(--preview-accent); border-radius: 14px;
      background: rgba(255,255,255,.96); color: var(--preview-ink);
      box-shadow: 0 16px 40px rgba(15,23,42,.16), 0 2px 8px rgba(15,23,42,.08);
      backdrop-filter: blur(16px); font-family: "Segoe UI Variable", "Microsoft YaHei UI", sans-serif; }
    #patch-preview-bar.visible { display: grid; }
    #patch-preview-bar .preview-overview { grid-area: overview; min-width: 0; display: flex;
      align-items: center; gap: 10px; }
    #patch-preview-bar .preview-eyebrow { flex: none; padding: 5px 7px; border-radius: 6px;
      background: #fff7ed; color: #9a3412; font-size: 10px; font-weight: 750;
      letter-spacing: .08em; line-height: 1; white-space: nowrap; }
    #patch-preview-summary { min-width: 0; overflow: hidden; color: var(--preview-ink);
      font-size: 13px; font-weight: 700; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
    #patch-preview-bar .preview-actions { grid-area: actions; display: flex; align-items: center;
      justify-content: flex-end; gap: 8px; white-space: nowrap; }
    #patch-preview-bar .segmented { display: inline-flex; flex: none; gap: 2px; padding: 3px;
      border: 1px solid #dbe2ea; border-radius: 10px; background: #f1f5f9; }
    #patch-preview-bar button { min-height: 32px; box-sizing: border-box; border: 1px solid transparent;
      border-radius: 8px; background: transparent; color: #475569; padding: 5px 10px;
      cursor: pointer; font: inherit; font-weight: 650; line-height: 1.2; white-space: nowrap;
      transition: background-color .15s ease, border-color .15s ease, color .15s ease; }
    #patch-preview-bar button:hover { background: #f8fafc; color: #0f172a; }
    #patch-preview-bar button:focus-visible { outline: 3px solid rgba(37,99,235,.28); outline-offset: 2px; }
    #patch-preview-bar .segmented button { min-width: 60px; }
    #patch-preview-bar .segmented button.active { border-color: #cbd5e1; background: #fff;
      color: #9a3412; box-shadow: 0 1px 3px rgba(15,23,42,.11); }
    #patch-preview-details-toggle { display: inline-flex; align-items: center; gap: 6px;
      border-color: #dbe2ea !important; background: #fff !important; color: #334155 !important; }
    #patch-preview-details-count { min-width: 19px; height: 18px; padding: 0 5px; box-sizing: border-box;
      display: inline-flex; align-items: center; justify-content: center; border-radius: 999px;
      background: #e2e8f0; color: #475569; font-size: 10px; font-weight: 750; }
    #patch-preview-bar button.danger { border-color: #fecaca; background: #fff; color: #b91c1c; }
    #patch-preview-bar button.danger:hover { border-color: #fca5a5; background: #fef2f2; color: #991b1b; }
    #patch-preview-bar button:disabled { opacity: .48; cursor: not-allowed; }
    #patch-preview-bar .preview-meta { grid-area: meta; min-width: 0; display: flex;
      align-items: center; gap: 14px; padding-top: 8px; border-top: 1px solid #e8edf3; }
    #patch-preview-guidance { min-width: 0; display: flex; align-items: center; gap: 7px;
      overflow: hidden; color: var(--preview-muted); font-size: 11px; text-overflow: ellipsis;
      white-space: nowrap; }
    #patch-preview-guidance::before { content: ""; flex: none; width: 7px; height: 7px;
      border-radius: 50%; background: #f59e0b; box-shadow: 0 0 0 3px #ffedd5; }
    #patch-preview-bar .legend { margin-left: auto; display: flex; flex-wrap: wrap;
      align-items: center; gap: 5px 11px; color: #475569; font-size: 11px; }
    #patch-preview-bar .legend span { display: inline-flex; align-items: center; white-space: nowrap; }
    #patch-preview-bar .swatch { display: inline-block; width: 8px; height: 8px; margin-right: 5px;
      border-radius: 50%; box-shadow: 0 0 0 1px rgba(15,23,42,.08); }
    #patch-preview-details { position: absolute; z-index: 10; display: none; top: calc(100% + 8px); right: 0;
      width: min(410px, calc(100vw - 24px)); max-height: min(58vh, 520px); overflow: hidden;
      border: 1px solid #dbe2ea; border-radius: 12px; background: rgba(255,255,255,.98);
      color: #334155; box-shadow: 0 18px 42px rgba(15,23,42,.18), 0 2px 8px rgba(15,23,42,.08);
      font-size: 12px; }
    #patch-preview-details.visible { display: block; }
    #patch-preview-details .details-head { position: sticky; top: 0; display: flex; align-items: center;
      gap: 8px; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; background: inherit; }
    #patch-preview-details .details-head strong { flex: 1; }
    #patch-preview-details .details-head button { width: 30px; height: 30px; border: 0;
      border-radius: 6px; background: transparent; color: #64748b; cursor: pointer; font-size: 18px; }
    #patch-preview-details .details-head button:hover { background: #f1f5f9; color: #0f172a; }
    #patch-preview-details-body { max-height: min(calc(58vh - 52px), 468px); overflow: auto;
      padding: 3px 12px 11px; scrollbar-gutter: stable; }
    #patch-preview-details .change { padding: 7px 0; border-bottom: 1px solid #e2e8f0; }
    #patch-preview-details .change:last-child { border-bottom: 0; }
    #patch-preview-details .property { display: grid; grid-template-columns: 94px 1fr 18px 1fr;
      align-items: center; gap: 5px; margin-top: 4px; }
    #patch-preview-details .value { overflow-wrap: anywhere; color: #475569; }
    #patch-preview-details .color { width: 14px; height: 14px; border: 1px solid #94a3b8; border-radius: 3px; }
    #fab-group { position: fixed; z-index: 3; right: 14px; bottom: 14px; display: flex;
      align-items: center; gap: 8px; }
    #history-btn, #ann-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px;
      border: 1px solid #c8d0dc; border-radius: 999px; background: #fff; color: #1f2937;
      cursor: pointer; box-shadow: 0 2px 8px rgba(15,23,42,.12); }
    #history-btn:hover, #ann-btn:hover { background: #f1f5f9; }
    #history-btn:disabled, #ann-btn:disabled { opacity: .5; cursor: not-allowed; }
    #ann-btn .dot { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
      background: #2563eb; color: #fff; font-size: 11px; font-weight: 600;
      display: inline-flex; align-items: center; justify-content: center; }
    #ann-btn .dot.zero { background: #cbd5e1; color: #475569; }
    #conflict-banner { position: fixed; z-index: 9; top: 12px; left: 50%; transform: translateX(-50%);
      display: none; align-items: center; gap: 10px; max-width: 92vw; padding: 10px 14px;
      border: 1px solid #f59e0b; border-radius: 10px; background: #fffbeb; color: #92400e;
      box-shadow: 0 4px 16px rgba(15,23,42,.16); }
    #conflict-banner.visible { display: flex; }
    #conflict-banner button { border: 1px solid #d97706; border-radius: 6px; background: #fff;
      color: #92400e; padding: 4px 10px; cursor: pointer; }
    #conflict-modal { position: fixed; z-index: 12; inset: 0; display: none; align-items: center;
      justify-content: center; padding: 24px; background: rgba(15, 23, 42, .58); backdrop-filter: blur(2px); }
    #conflict-modal.open { display: flex; }
    #conflict-modal .dialog { width: min(760px, 96vw); max-height: min(720px, 90vh); display: flex;
      flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 18px;
      background: #fff; color: #0f172a; box-shadow: 0 24px 70px rgba(15,23,42,.32); }
    #conflict-modal header { display: flex; gap: 12px; padding: 20px 22px 16px; border-bottom: 1px solid #e2e8f0; }
    #conflict-modal .conflict-icon { width: 38px; height: 38px; flex: 0 0 38px; display: grid;
      place-items: center; border-radius: 11px; background: #fff7ed; color: #c2410c; font-size: 21px; }
    #conflict-modal h2 { margin: 0 0 5px; font-size: 18px; }
    #conflict-modal .subtitle { margin: 0; color: #64748b; line-height: 1.55; }
    #conflict-details { overflow-y: auto; padding: 16px 22px; }
    .conflict-card { margin-bottom: 12px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 12px; }
    .conflict-card:last-child { margin-bottom: 0; }
    .conflict-card-title { display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .conflict-card-title strong { font-size: 13px; }
    .conflict-card-title code { color: #64748b; font-size: 11px; }
    .conflict-columns { display: grid; grid-template-columns: 1fr 1fr; }
    .conflict-version { min-width: 0; padding: 12px; }
    .conflict-version + .conflict-version { border-left: 1px solid #e2e8f0; }
    .conflict-version.user { background: #eff6ff; }
    .conflict-version.agent { background: #fff7ed; }
    .conflict-version .version-title { margin-bottom: 8px; font-size: 12px; font-weight: 700; }
    .conflict-version.user .version-title { color: #1d4ed8; }
    .conflict-version.agent .version-title { color: #c2410c; }
    .conflict-field { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 7px;
      margin-top: 6px; line-height: 1.45; }
    .conflict-field .field-name { color: #64748b; }
    .conflict-field .field-value { overflow-wrap: anywhere; white-space: pre-wrap; }
    #conflict-modal footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px;
      padding: 14px 22px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
    #conflict-modal footer .danger-note { margin-right: auto; color: #64748b; font-size: 12px; }
    #conflict-modal footer button { padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 8px;
      background: #fff; color: #334155; cursor: pointer; font-weight: 600; }
    #conflict-modal footer .primary { border-color: #2563eb; background: #2563eb; color: #fff; }
    #history-modal { position: fixed; z-index: 7; inset: 0; display: none; align-items: center;
      justify-content: center; background: rgba(15, 23, 42, .5); }
    #history-modal.open { display: flex; }
    #history-modal .modal { width: min(920px, 96vw); height: min(78vh, 92vh); display: flex;
      flex-direction: column; background: #fff; border-radius: 14px; box-shadow: 0 16px 48px rgba(15,23,42,.28);
      overflow: hidden; }
    #history-modal header { display: flex; align-items: center; gap: 8px; padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0; }
    #history-modal header strong { font-size: 15px; }
    #history-modal header .spacer { flex: 1; }
    #history-modal header button { border: 1px solid #c8d0dc; border-radius: 6px; background: #fff;
      padding: 4px 10px; cursor: pointer; }
    .h-body { flex: 1; display: flex; min-height: 0; }
    .h-list-pane { width: 300px; min-width: 240px; border-right: 1px solid #e2e8f0; overflow-y: auto;
      padding: 10px 12px; }
    .h-preview-pane { flex: 1; display: flex; flex-direction: column; min-width: 0; padding: 14px; }
    .h-card { display: flex; gap: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px;
      margin-bottom: 10px; background: #fafbfc; cursor: pointer; }
    .h-card.selected { border-color: #2563eb; background: #eff6ff; }
    .h-card.current { opacity: .92; }
    .h-card .h-thumb { width: 96px; height: 72px; flex-shrink: 0; border: 1px solid #e2e8f0;
      border-radius: 6px; background: #fff; display: flex; align-items: center; justify-content: center;
      overflow: hidden; }
    .h-card .h-thumb img { width: 100%; height: 100%; object-fit: contain; }
    .h-thumb .ph { font-size: 10px; color: #94a3b8; text-align: center; padding: 2px; }
    .h-card .h-meta { min-width: 0; }
    .h-card .h-ver { font-weight: 700; font-size: 13px; }
    .h-card .h-badges { display: flex; flex-wrap: wrap; gap: 4px; margin: 3px 0; }
    .h-badge { font-size: 10px; padding: 1px 6px; border-radius: 999px; font-weight: 600; }
    .h-badge.cur { background: #2563eb; color: #fff; }
    .h-badge.initial { background: #e2e8f0; color: #475569; }
    .h-badge.editor { background: #dbeafe; color: #1d4ed8; }
    .h-badge.agent { background: #f3e8ff; color: #7e22ce; }
    .h-badge.external { background: #fef3c7; color: #b45309; }
    .h-badge.restore { background: #dcfce7; color: #15803d; }
    .h-card .h-time, .h-card .h-pages { font-size: 11px; color: #64748b; }
    .h-card .h-restored { font-size: 11px; color: #15803d; }
    .h-preview-pane .h-preview-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .h-preview-pane .h-preview-head select { padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 6px;
      background: #fff; }
    .h-preview-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff;
      display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 0; }
    .h-preview-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .h-preview-box .ph { color: #94a3b8; font-size: 13px; text-align: center; padding: 16px; }
    .h-preview-box .ph button { margin-top: 8px; border: 1px solid #c8d0dc; border-radius: 6px;
      background: #fff; padding: 4px 10px; cursor: pointer; }
    .h-foot { padding: 12px 16px; border-top: 1px solid #e2e8f0; display: flex; align-items: center;
      gap: 10px; }
    .h-foot .note { flex: 1; font-size: 11px; color: #64748b; }
    .h-foot button { border: 1px solid #c8d0dc; border-radius: 8px; background: #fff; padding: 7px 14px;
      cursor: pointer; }
    .h-foot .primary { border-color: #2563eb; background: #2563eb; color: #fff; }
    .h-foot .primary:disabled { opacity: .5; cursor: not-allowed; }
    .h-list-skeleton { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 10px;
      background: #f8fafc; }
    .h-list-skeleton .ln { height: 10px; border-radius: 5px; background: #e2e8f0; margin-bottom: 8px; }
    #history-confirm { position: fixed; z-index: 8; inset: 0; display: none; align-items: center;
      justify-content: center; background: rgba(15, 23, 42, .45); }
    #history-confirm.open { display: flex; }
    #history-confirm .box { width: min(420px, 92vw); background: #fff; border-radius: 12px; padding: 18px;
      box-shadow: 0 16px 48px rgba(15,23,42,.3); }
    #history-confirm .box p { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #1f2937; }
    #history-confirm .box small { color: #64748b; }
    #history-confirm .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
    #history-confirm .actions button { border: 1px solid #c8d0dc; border-radius: 8px; background: #fff;
      padding: 7px 14px; cursor: pointer; }
    #history-confirm .actions .primary { border-color: #2563eb; background: #2563eb; color: #fff; }
    #restore-overlay { position: fixed; z-index: 10; inset: 0; display: none; align-items: center;
      justify-content: center; background: rgba(15, 23, 42, .35); color: #fff; }
    #restore-overlay.visible { display: flex; }
    #restore-overlay .box { background: #1e293b; border-radius: 12px; padding: 20px 26px; text-align: center; }
    #restore-overlay .spin { width: 28px; height: 28px; margin: 0 auto 10px; border: 3px solid #475569;
      border-top-color: #2563eb; border-radius: 50%; animation: h-spin .8s linear infinite; }
    @keyframes h-spin { to { transform: rotate(360deg); } }
    .h-msg { padding: 8px 12px; border-radius: 8px; font-size: 12px; }
    .h-msg.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .h-msg.error button { margin-left: 8px; border: 1px solid #b91c1c; border-radius: 6px; background: #fff;
      color: #b91c1c; padding: 2px 8px; cursor: pointer; }
    @media (max-width: 700px) {
      .h-body { flex-direction: column; }
      .h-list-pane { width: auto; min-width: 0; border-right: 0; border-bottom: 1px solid #e2e8f0;
        max-height: 42%; }
    }
    #ann-drawer { position: fixed; z-index: 5; top: 0; right: 0; height: 100%; width: 360px;
      max-width: 90vw; transform: translateX(100%); transition: transform .2s ease;
      background: #fff; border-left: 1px solid #e2e8f0; box-shadow: -4px 0 16px rgba(15,23,42,.08);
      display: flex; flex-direction: column; }
    #ann-drawer.open { transform: translateX(0); }
    #ann-drawer header { display: flex; align-items: center; gap: 8px; padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0; }
    #ann-drawer header strong { font-size: 14px; }
    #ann-drawer header .spacer { flex: 1; }
    #ann-drawer header button { border: 1px solid #c8d0dc; border-radius: 6px; background: #fff;
      padding: 4px 8px; cursor: pointer; }
    #ann-drawer .new-btn { border-color: #2563eb; background: #2563eb; color: #fff; }
    #ann-filters { display: flex; align-items: center; gap: 8px; padding: 9px 14px;
      border-bottom: 1px solid #e2e8f0; }
    #ann-filters label { color: #64748b; font-size: 12px; }
    #ann-filter { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff;
      padding: 5px 8px; }
    #ann-list { flex: 1; overflow-y: auto; padding: 10px 14px; }
    #ann-list .item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;
      margin-bottom: 10px; background: #fafbfc; }
    #ann-list .item.resolved { opacity: .65; background: #f1f5f9; }
    #ann-list .item.ignored { opacity: .65; background: #f8fafc; }
    #ann-list .item .meta { display: flex; align-items: center; gap: 6px; font-size: 11px;
      color: #64748b; margin-bottom: 6px; }
    #ann-list .item .badge { padding: 1px 7px; border-radius: 999px; font-weight: 600; }
    #ann-list .item .badge.open { background: #dbeafe; color: #1d4ed8; }
    #ann-list .item .badge.stale { background: #fef3c7; color: #b45309; }
    #ann-list .item .badge.resolved { background: #dcfce7; color: #15803d; }
    #ann-list .item .badge.ignored { background: #e2e8f0; color: #475569; }
    #ann-list .item .instruction { color: #1f2937; white-space: pre-wrap; word-break: break-word; }
    #ann-list .item .cells { font-size: 11px; color: #64748b; margin-top: 6px; }
    #ann-list .item .item-actions { display: flex; gap: 6px; margin-top: 8px; }
    #ann-list .item .item-actions button { border: 1px solid #c8d0dc; border-radius: 6px;
      background: #fff; padding: 4px 10px; cursor: pointer; }
    #ann-list .item .item-actions button:hover { background: #f1f5f9; }
    #ann-none { color: #94a3b8; text-align: center; padding: 24px 8px; }
    #ann-form { display: none; flex: 1; flex-direction: column; }
    #ann-form.visible { display: flex; }
    #ann-form .field { padding: 10px 14px; }
    #ann-form .selection { font-size: 12px; color: #475569; background: #f1f5f9;
      border-radius: 6px; padding: 8px 10px; margin: 0 14px; }
    #ann-form textarea { width: 100%; min-height: 96px; resize: vertical; font: inherit;
      padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; }
    #ann-form fieldset { margin: 0 14px 10px; padding: 8px 10px; border: 1px solid #cbd5e1;
      border-radius: 6px; display: grid; gap: 7px; }
    #ann-form fieldset legend { padding: 0 5px; font-size: 12px; color: #475569; }
    #ann-form fieldset label { display: flex; align-items: flex-start; gap: 7px; cursor: pointer; }
    #ann-form fieldset small { display: block; color: #64748b; margin-top: 2px; }
    #ann-form .actions { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 14px;
      border-top: 1px solid #e2e8f0; }
    #ann-form .actions button { border: 1px solid #c8d0dc; border-radius: 6px; background: #fff;
      padding: 6px 12px; cursor: pointer; }
    #ann-form .actions .primary { border-color: #2563eb; background: #2563eb; color: #fff; }
    #ann-form .actions .primary:disabled { opacity: .5; cursor: not-allowed; }
    @media (max-width: 760px) {
      #patch-preview-bar { top: 8px; width: calc(100vw - 16px); grid-template-columns: 1fr;
        grid-template-areas: "overview" "actions" "meta"; gap: 9px; padding: 10px 11px 9px; }
      #patch-preview-bar .preview-actions { justify-content: stretch; }
      #patch-preview-bar .segmented { flex: 1 1 auto; min-width: 0; }
      #patch-preview-bar .segmented button { flex: 1 1 0; min-width: 0; }
      #patch-preview-bar .preview-meta { align-items: flex-start; flex-wrap: wrap; gap: 7px 12px; }
      #patch-preview-guidance { flex-basis: 100%; }
      #patch-preview-bar .legend { margin-left: 0; }
      #patch-preview-details { width: min(390px, 100%); }
    }
    @media (max-width: 440px) {
      #patch-preview-bar .preview-actions { display: grid; grid-template-columns: 1fr auto; }
      #patch-preview-bar .segmented { grid-column: 1 / -1; }
      #patch-preview-details-toggle { justify-content: center; }
      #patch-preview-summary { font-size: 12px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #patch-preview-bar button { transition: none; }
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0f172a; }
      #patch-preview-bar { --preview-ink: #f8fafc; --preview-muted: #94a3b8;
        border-color: #334155; border-top-color: #f59e0b; background: rgba(15,23,42,.96); }
      #patch-preview-bar .preview-eyebrow { background: #431407; color: #fed7aa; }
      #patch-preview-bar .segmented { border-color: #334155; background: #111827; }
      #patch-preview-bar button { color: #cbd5e1; }
      #patch-preview-bar button:hover { background: #243049; color: #f8fafc; }
      #patch-preview-bar .segmented button.active { border-color: #475569; background: #334155; color: #fed7aa; }
      #patch-preview-details-toggle { border-color: #475569 !important; background: #1e293b !important;
        color: #e2e8f0 !important; }
      #patch-preview-details-count { background: #334155; color: #cbd5e1; }
      #patch-preview-bar button.danger { border-color: #7f1d1d; background: #1f1518; color: #fca5a5; }
      #patch-preview-bar button.danger:hover { border-color: #b91c1c; background: #450a0a; color: #fecaca; }
      #patch-preview-bar .preview-meta { border-color: #334155; }
      #patch-preview-guidance::before { box-shadow: 0 0 0 3px #431407; }
      #patch-preview-bar .legend { color: #cbd5e1; }
      #patch-preview-details { border-color: #334155; background: rgba(15,23,42,.98); color: #e2e8f0; }
      #patch-preview-details .details-head, #patch-preview-details .change { border-color: #334155; }
      #patch-preview-details .details-head button { color: #94a3b8; }
      #patch-preview-details .details-head button:hover { background: #243049; color: #f8fafc; }
      #patch-preview-details .value { color: #cbd5e1; }
      #history-btn, #ann-btn, #ann-drawer { background: #1e293b; color: #e2e8f0; border-color: #334155; }
      #history-btn:hover, #ann-btn:hover, #ann-drawer header button { background: #243049; }
      #ann-filters { background: #172033; border-color: #334155; }
      #ann-filter { background: #0f172a; color: #e2e8f0; border-color: #334155; }
      #ann-list .item { background: #243049; border-color: #334155; }
      #ann-list .item .item-actions button { background: #243049; color: #e2e8f0; border-color: #334155; }
      #ann-list .item .instruction { color: #e2e8f0; }
      #ann-list .item .meta, #ann-list .item .cells { color: #94a3b8; }
      #ann-form textarea { background: #0f172a; color: #e2e8f0; border-color: #334155; }
      #ann-form .selection { background: #243049; color: #cbd5e1; }
      #ann-form fieldset { border-color: #334155; }
      #ann-form fieldset legend, #ann-form fieldset small { color: #94a3b8; }
      #ann-none { color: #475569; }
      #history-modal .modal { background: #1e293b; }
      #history-modal header, .h-list-pane, .h-foot { border-color: #334155; }
      #history-modal header button, .h-foot button, #history-confirm .actions button {
        background: #243049; color: #e2e8f0; border-color: #475569; }
      .h-card { background: #243049; border-color: #334155; }
      .h-card.selected { border-color: #3b82f6; background: #1e3a5f; }
      .h-card .h-thumb { border-color: #334155; background: #0f172a; }
      .h-card .h-time, .h-card .h-pages { color: #94a3b8; }
      .h-thumb .ph, .h-preview-box .ph { color: #64748b; }
      .h-preview-pane .h-preview-head select { background: #0f172a; color: #e2e8f0; border-color: #334155; }
      .h-preview-box { background: #0f172a; border-color: #334155; }
      .h-preview-box .ph button { background: #243049; color: #e2e8f0; border-color: #475569; }
      .h-foot .note { color: #94a3b8; }
      .h-badge.initial { background: #334155; color: #cbd5e1; }
      #history-confirm .box { background: #1e293b; }
      #history-confirm .box p { color: #e2e8f0; }
      #history-confirm .box small { color: #94a3b8; }
      .h-list-skeleton { background: #243049; border-color: #334155; }
      .h-list-skeleton .ln { background: #334155; }
      #conflict-banner { background: #451a03; border-color: #b45309; color: #fde68a; }
      #conflict-banner button { background: #451a03; color: #fde68a; border-color: #d97706; }
      #conflict-modal .dialog { background: #111827; color: #f8fafc; border-color: #334155; }
      #conflict-modal header, #conflict-modal footer, .conflict-card,
      .conflict-card-title, .conflict-version + .conflict-version { border-color: #334155; }
      #conflict-modal .subtitle, #conflict-modal footer .danger-note,
      .conflict-field .field-name, .conflict-card-title code { color: #94a3b8; }
      #conflict-modal footer, .conflict-card-title { background: #1e293b; }
      .conflict-version.user { background: #172554; }
      .conflict-version.agent { background: #431407; }
      #conflict-modal footer button { background: #1e293b; color: #e2e8f0; border-color: #475569; }
      #conflict-modal footer .primary { background: #2563eb; border-color: #2563eb; color: #fff; }
    }
  </style>
</head>
<body>
  <iframe id="editor" title="Draw.io editor"></iframe>
  <div id="status" role="status"></div>
  <div id="patch-preview-bar" role="region" aria-label="Agent \u4FEE\u6539\u9884\u89C8">
    <div class="preview-overview">
      <span class="preview-eyebrow">AGENT \u9884\u89C8</span>
      <strong id="patch-preview-summary">\u6B63\u5728\u51C6\u5907\u4FEE\u6539\u6458\u8981</strong>
    </div>
    <div class="preview-actions">
      <div class="segmented" role="group" aria-label="\u9884\u89C8\u663E\u793A\u65B9\u5F0F">
        <button type="button" id="patch-preview-before" aria-pressed="false">\u4FEE\u6539\u524D</button>
        <button type="button" id="patch-preview-after" aria-pressed="false">\u4FEE\u6539\u540E</button>
        <button type="button" id="patch-preview-compare" class="active" aria-pressed="true">\u5BF9\u6BD4</button>
      </div>
      <button type="button" id="patch-preview-details-toggle" aria-expanded="true"
        aria-controls="patch-preview-details">\u53D8\u5316\u8BE6\u60C5 <span id="patch-preview-details-count">0</span></button>
      <button type="button" id="patch-preview-cancel" class="danger">\u53D6\u6D88\u4FEE\u6539</button>
    </div>
    <div class="preview-meta">
      <span id="patch-preview-guidance" role="status">\u53EA\u8BFB\u9884\u89C8\uFF0C\u4E0D\u4F1A\u5199\u5165\u6E90\u6587\u4EF6</span>
      <span class="legend" aria-label="\u5BF9\u6BD4\u989C\u8272\u8BF4\u660E">
        <span><i class="swatch" style="background:#22c55e"></i>\u65B0\u589E</span>
        <span><i class="swatch" style="background:#f59e0b"></i>\u4FEE\u6539</span>
        <span><i class="swatch" style="background:#ef4444"></i>\u5220\u9664/\u539F\u4F4D\u7F6E</span>
        <span><i class="swatch" style="background:#3b82f6"></i>\u8FDE\u7EBF</span>
      </span>
    </div>
    <aside id="patch-preview-details" aria-live="polite" aria-label="\u4FEE\u6539\u53D8\u5316\u8BE6\u60C5">
      <div class="details-head">
        <strong>\u53D8\u5316\u8BE6\u60C5</strong>
        <button type="button" id="patch-preview-details-close" aria-label="\u5173\u95ED\u53D8\u5316\u8BE6\u60C5">\xD7</button>
      </div>
      <div id="patch-preview-details-body"></div>
    </aside>
  </div>
  <div id="conflict-banner" role="alert">
    <span id="conflict-message">\u56FE\u8868\u521A\u53D1\u751F\u53D8\u5316\uFF0C\u5F53\u524D\u753B\u5E03\u6682\u672A\u4FDD\u5B58\uFF0C\u8BF7\u786E\u8BA4\u6700\u65B0\u7248\u672C\u3002</span>
    <button type="button" id="conflict-retry" style="display:none">\u91CD\u8BD5\u52A0\u8F7D</button>
    <button type="button" id="conflict-overwrite" style="display:none">\u4FDD\u7559\u6211\u7684\u7248\u672C\u5E76\u8986\u76D6</button>
    <button type="button" id="conflict-reload">\u91CD\u65B0\u52A0\u8F7D\u6700\u65B0\u7248\u672C</button>
  </div>
  <div id="conflict-modal" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
    <div class="dialog">
      <header>
        <div class="conflict-icon" aria-hidden="true">!</div>
        <div>
          <h2 id="conflict-title">\u53D1\u73B0\u7248\u672C\u51B2\u7A81</h2>
          <p class="subtitle" id="conflict-subtitle">AI \u548C\u4F60\u4FEE\u6539\u4E86\u540C\u4E00\u5904\u5185\u5BB9\u3002\u753B\u5E03\u4ECD\u4FDD\u7559\u4F60\u7684\u7248\u672C\uFF0C\u8BF7\u9009\u62E9\u5982\u4F55\u5904\u7406\u3002</p>
        </div>
      </header>
      <div id="conflict-details"></div>
      <footer>
        <span class="danger-note">\u8986\u76D6\u64CD\u4F5C\u4F1A\u4E22\u5F03 AI \u5728\u51B2\u7A81\u4F4D\u7F6E\u7684\u4FEE\u6539\u3002</span>
        <button type="button" id="conflict-modal-reload">\u4F7F\u7528 AI \u7248\u672C</button>
        <button type="button" class="primary" id="conflict-modal-overwrite">\u4FDD\u7559\u6211\u7684\u7248\u672C\u5E76\u8986\u76D6</button>
      </footer>
    </div>
  </div>
  <div id="fab-group">
    <button id="history-btn" type="button" title="\u67E5\u770B\u5386\u53F2\u7248\u672C">
      <span aria-hidden="true">\uD83D\uDD58</span><span>\u5386\u53F2</span>
    </button>
    <button id="ann-btn" type="button" title="\u6CE8\u91CA\u4E0E\u4FEE\u6539\u4EFB\u52A1">
      <span>\u6CE8\u91CA</span><span class="dot zero" id="ann-count">0</span>
    </button>
  </div>
  <div id="ann-drawer" aria-hidden="true">
    <header>
      <strong>\u6CE8\u91CA\u4EFB\u52A1</strong>
      <span class="spacer"></span>
      <button type="button" class="new-btn" id="ann-new">\uFF0B \u6DFB\u52A0\u6CE8\u91CA</button>
      <button type="button" id="ann-close">\u5173\u95ED</button>
    </header>
    <div id="ann-filters">
      <label for="ann-filter">\u72B6\u6001</label>
      <select id="ann-filter">
        <option value="pending">\u5F85\u5904\u7406</option>
        <option value="fresh">\u672A\u5B8C\u6210</option>
        <option value="stale">\u5DF2\u8FC7\u65F6</option>
        <option value="resolved">\u5DF2\u5B8C\u6210</option>
        <option value="ignored">\u5DF2\u5FFD\u7565</option>
        <option value="all">\u5168\u90E8</option>
      </select>
    </div>
    <div id="ann-list"></div>
    <div id="ann-form">
      <div class="field">
        <div class="selection" id="ann-selection">\u6B63\u5728\u83B7\u53D6\u9009\u4E2D\u5185\u5BB9\u2026</div>
      </div>
      <div class="field">
        <textarea id="ann-instruction" placeholder="\u4FEE\u6539\u8BF4\u660E\uFF1A\u63CF\u8FF0\u8FD9\u91CC\u8981\u600E\u4E48\u6539\uFF08\u4F8B\u5982\uFF1A\u628A\u8BE5\u8282\u70B9\u6539\u540D\u4E3A Redis \u7F13\u5B58\u5C42\uFF0C\u5E76\u589E\u52A0\u4E00\u6761\u4ECE\u5E94\u7528\u5230\u6B64\u7684\u8FDE\u7EBF\uFF09"></textarea>
      </div>
      <fieldset>
        <legend>\u5141\u8BB8 Agent \u4FEE\u6539\u7684\u8303\u56F4</legend>
        <label><input type="radio" name="ann-scope" value="selection_only" checked>
          <span>\u53EA\u4FEE\u6539\u9009\u533A<small>\u4EC5\u5141\u8BB8\u4FEE\u6539\u5DF2\u9009\u4E2D\u7684\u8282\u70B9\u6216\u8FDE\u7EBF\u3002</small></span></label>
        <label><input type="radio" name="ann-scope" value="selection_and_edges">
          <span>\u5141\u8BB8\u8C03\u6574\u5173\u8054\u8FDE\u7EBF<small>\u53EF\u540C\u65F6\u8C03\u6574\u4E0E\u9009\u4E2D\u8282\u70B9\u76F4\u63A5\u76F8\u8FDE\u7684\u8FDE\u7EBF\u3002</small></span></label>
        <label><input type="radio" name="ann-scope" value="surrounding_layout">
          <span>\u5141\u8BB8\u8C03\u6574\u5468\u8FB9\u5E03\u5C40<small>\u53EF\u8C03\u6574\u9009\u533A\u9644\u8FD1\u53CA\u4E00\u8DF3\u5173\u8054\u7684\u8282\u70B9\u548C\u8FDE\u7EBF\u3002</small></span></label>
        <label><input type="radio" name="ann-scope" value="diagram_wide">
          <span>\u5141\u8BB8\u4FEE\u6539\u6574\u4E2A\u56FE\u8868<small>\u53EF\u8C03\u6574\u5F53\u524D\u56FE\u8868\u5168\u90E8\u9875\u9762\u4E2D\u7684\u8282\u70B9\u3001\u8FDE\u7EBF\u548C\u5E03\u5C40\uFF0C\u4E0D\u5305\u62EC\u5176\u5B83\u6587\u4EF6\u3002</small></span></label>
      </fieldset>
      <div style="margin:0 14px 10px;font-size:11px;color:#64748b">\u63D0\u4EA4\u6CE8\u91CA\u4E0D\u4F1A\u7ACB\u5373\u6539\u56FE\u3002Agent\u4F1A\u5148\u5C55\u793A\u5177\u4F53\u4FEE\u6539\u8BA1\u5212\uFF0COpenCode\u5F39\u51FA\u786E\u8BA4\u540E\u624D\u6267\u884C\u3002</div>
      <div class="actions">
        <button type="button" id="ann-cancel">\u53D6\u6D88</button>
        <button type="button" class="primary" id="ann-submit" disabled>\u63D0\u4EA4\u6CE8\u91CA</button>
      </div>
    </div>
  </div>
  <div id="history-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-label="\u7248\u672C\u5386\u53F2">
    <div class="modal">
      <header>
        <strong>\u7248\u672C\u5386\u53F2</strong>
        <span class="spacer"></span>
        <button type="button" id="hist-refresh">\u5237\u65B0</button>
        <button type="button" id="hist-close">\u5173\u95ED</button>
      </header>
      <div class="h-body">
        <div class="h-list-pane" id="hist-list" tabindex="0"></div>
        <div class="h-preview-pane">
          <div class="h-preview-head">
            <label for="hist-page">\u9875\u9762\uFF1A</label>
            <select id="hist-page" disabled></select>
          </div>
          <div class="h-preview-box" id="hist-preview">
            <div class="ph">\u9009\u62E9\u5DE6\u4FA7\u7248\u672C\u67E5\u770B\u9884\u89C8</div>
          </div>
        </div>
      </div>
      <div class="h-foot">
        <div class="note" id="hist-note">\u6062\u590D\u4F1A\u521B\u5EFA\u65B0\u7248\u672C\uFF0C\u5F53\u524D\u7248\u672C\u4E0D\u4F1A\u88AB\u5220\u9664\u3002</div>
        <button type="button" id="hist-cancel">\u53D6\u6D88</button>
        <button type="button" class="primary" id="hist-restore" disabled>\u6062\u590D\u6B64\u7248\u672C</button>
      </div>
    </div>
  </div>
  <div id="history-confirm" aria-hidden="true" role="dialog" aria-modal="true" aria-label="\u786E\u8BA4\u6062\u590D">
    <div class="box">
      <p id="hist-confirm-text">\u5C06\u56FE\u8868\u6062\u590D\u4E3A v8 \u7684\u5185\u5BB9\uFF1F</p>
      <small>\u5F53\u524D\u7248\u672C\u4E0D\u4F1A\u88AB\u5220\u9664\uFF0C\u6062\u590D\u64CD\u4F5C\u4F1A\u521B\u5EFA\u4E00\u4E2A\u65B0\u7684\u7248\u672C\u3002</small>
      <div class="actions">
        <button type="button" id="hist-confirm-cancel">\u53D6\u6D88</button>
        <button type="button" class="primary" id="hist-confirm-ok">\u786E\u8BA4\u6062\u590D</button>
      </div>
    </div>
  </div>
  <div id="restore-overlay" aria-hidden="true">
    <div class="box">
      <div class="spin"></div>
      <div>\u6B63\u5728\u6062\u590D\u5386\u53F2\u7248\u672C\u2026</div>
    </div>
  </div>
  <script>
    (() => {
      const CONFIG = ${K};
      const editor = document.getElementById("editor");
      const status = document.getElementById("status");
      const clientId = crypto.randomUUID();
      let current = null;
      let canvasRevision = 0;
      let lastEditorXml = null;
      let saveChain = Promise.resolve();
      let externalTimer = null;
      let editorReady = false;
      let pendingExport = null; // file export requested via SSE editor-command
      let exportWorker = null;
      let exportWorkerReady = false;
      let exportWorkerLoaded = false;
      let pendingSelection = null;
      let awaitingSelection = false;
      let editorMode = "editing"; // editing | preview-loading | previewing | preview-exiting | restoring | loading-restored-xml | conflict
      let historyOpen = false;
      let selectedSnapshot = null;
      let confirmSnapshot = null;
      let restoreTargetXml = null;
      let preRestoreXml = null;
      let pendingRestore = null; // { xml } kept so a load timeout can retry the same target
      let pendingConflict = null; // { xml, latest, merge } kept until the user chooses
      let restoreLoadTimer = null;
      let activePatchPreview = null;
      let previewTargetXml = null;
      let previewExitXml = null;
      let patchPreviewView = "compare";
      let patchPreviewDetailsExpanded = true;

      const historyBtn = document.getElementById("history-btn");
      const annBtn = document.getElementById("ann-btn");
      const annCount = document.getElementById("ann-count");
      const annDrawer = document.getElementById("ann-drawer");
      const annFilter = document.getElementById("ann-filter");
      const annList = document.getElementById("ann-list");
      const annForm = document.getElementById("ann-form");
      const annSelection = document.getElementById("ann-selection");
      const annInstruction = document.getElementById("ann-instruction");
      const annSubmit = document.getElementById("ann-submit");
      const conflictBanner = document.getElementById("conflict-banner");
      const conflictModal = document.getElementById("conflict-modal");
      const conflictDetails = document.getElementById("conflict-details");
      const histModal = document.getElementById("history-modal");
      const histList = document.getElementById("hist-list");
      const histPreview = document.getElementById("hist-preview");
      const histPage = document.getElementById("hist-page");
      const histRestore = document.getElementById("hist-restore");
      const histNote = document.getElementById("hist-note");
      const histConfirm = document.getElementById("history-confirm");
      const restoreOverlay = document.getElementById("restore-overlay");
      const patchPreviewBar = document.getElementById("patch-preview-bar");
      const patchPreviewSummary = document.getElementById("patch-preview-summary");
      const patchPreviewGuidance = document.getElementById("patch-preview-guidance");
      const patchPreviewBefore = document.getElementById("patch-preview-before");
      const patchPreviewAfter = document.getElementById("patch-preview-after");
      const patchPreviewCompare = document.getElementById("patch-preview-compare");
      const patchPreviewDetailsToggle = document.getElementById("patch-preview-details-toggle");
      const patchPreviewDetailsCount = document.getElementById("patch-preview-details-count");
      const patchPreviewDetails = document.getElementById("patch-preview-details");
      const patchPreviewDetailsBody = document.getElementById("patch-preview-details-body");

      function selectedAnnotationScope() {
        return document.querySelector('input[name="ann-scope"]:checked')?.value || "selection_only";
      }

      function showStatus(message, duration = 2400) {
        status.textContent = message;
        status.classList.add("visible");
        clearTimeout(showStatus.timer);
        showStatus.timer = setTimeout(() => status.classList.remove("visible"), duration);
      }

      function sendEditor(payload) {
        editor.contentWindow?.postMessage(JSON.stringify(payload), CONFIG.drawioOrigin);
      }

      function sendExportWorker(payload) {
        exportWorker?.contentWindow?.postMessage(JSON.stringify(payload), CONFIG.drawioOrigin);
      }

      function clearExportWorker() {
        exportWorkerReady = false;
        exportWorkerLoaded = false;
        if (exportWorker) exportWorker.remove();
        exportWorker = null;
      }

      function startExportWorker(active) {
        clearExportWorker();
        const workerUrl = new URL(CONFIG.drawioUrl);
        if (active.pageId) workerUrl.searchParams.set("page-id", active.pageId);
        workerUrl.searchParams.set("export-worker", active.requestId);
        exportWorker = document.createElement("iframe");
        exportWorker.setAttribute("aria-hidden", "true");
        exportWorker.style.position = "fixed";
        exportWorker.style.left = "-10000px";
        exportWorker.style.top = "0";
        exportWorker.style.width = "1200px";
        exportWorker.style.height = "800px";
        exportWorker.style.opacity = "0";
        exportWorker.style.pointerEvents = "none";
        exportWorker.src = workerUrl.toString();
        document.body.appendChild(exportWorker);
      }

      function dispatchExport() {
        if (!pendingExport) return;
        const active = pendingExport;
        if (active.useWorker && (!exportWorkerReady || !exportWorkerLoaded)) return;
        if (!active.useWorker && !editorReady) return;
        const payload = {
          action: "export",
          format: active.format,
          currentPage: !active.allPages,
          allPages: active.allPages,
          message: { requestId: active.requestId },
        };
        if (active.useWorker) sendExportWorker(payload);
        else sendEditor(payload);
      }

      async function reportEditorExportError(requestId, message) {
        try {
          await fetch(CONFIG.editorExportUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ requestId, error: String(message || "export failed") }),
          });
        } catch { /* \u4E0A\u62A5\u5931\u8D25\u65F6\u4EC5\u4FDD\u7559\u9875\u9762\u63D0\u793A */ }
      }

      async function saveExport(message) {
        const active = pendingExport;
        pendingExport = null;
        clearExportWorker();
        try {
          if (typeof message.data !== "string" || !message.data) {
            throw new Error("Draw.io \u672A\u8FD4\u56DE\u5BFC\u51FA\u6570\u636E");
          }
          const response = await fetch(CONFIG.editorExportUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              requestId: active.requestId,
              format: active.format,
              data: message.data,
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.ok) throw new Error(result.error || "\u5BFC\u51FA\u7ED3\u679C\u4FDD\u5B58\u5931\u8D25");
          showStatus("\u5DF2\u5BFC\u51FA " + result.outputPath + "\uFF08" + result.bytes + " \u5B57\u8282\uFF09", 6000);
        } catch (error) {
          showStatus(error.message || "\u5BFC\u51FA\u5931\u8D25", 6000);
          void reportEditorExportError(active.requestId, error.message);
        }
      }

      function requestEditorExport(command) {
        if (editorMode === "preview-loading" || editorMode === "previewing" || editorMode === "preview-exiting") {
          showStatus("\u53EA\u8BFB\u4FEE\u6539\u9884\u89C8\u671F\u95F4\u4E0D\u80FD\u4ECE\u5F53\u524D\u753B\u5E03\u5BFC\u51FA", 4000);
          void reportEditorExportError(command.requestId, "patch preview is active");
          return;
        }
        if (pendingExport) {
          showStatus("\u5DF2\u6709\u4E00\u6B21\u5BFC\u51FA\u6B63\u5728\u8FDB\u884C\uFF0C\u8BF7\u7A0D\u5019", 3000);
          void reportEditorExportError(command.requestId, "another export is already running on this page");
          return;
        }
        const useWorker = typeof command.xml === "string" && command.xml.length > 0
          && (Boolean(command.pageId) || command.allPages === true);
        pendingExport = {
          format: command.format,
          requestId: command.requestId,
          pageId: typeof command.pageId === "string" ? command.pageId : null,
          allPages: command.allPages === true,
          xml: useWorker ? command.xml : null,
          useWorker,
        };
        showStatus((editorReady ? "\u6B63\u5728\u5BFC\u51FA " : "\u7B49\u5F85\u7F16\u8F91\u5668\u5C31\u7EEA\u540E\u5BFC\u51FA ") + command.format + "\u2026", 10000);
        if (useWorker) startExportWorker(pendingExport);
        dispatchExport();
      }

      async function readLatest() {
        const response = await fetch(CONFIG.apiUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("\u8BFB\u53D6\u56FE\u8868\u5931\u8D25\uFF08HTTP " + response.status + "\uFF09");
        return response.json();
      }

      async function readPatchPreview() {
        const response = await fetch(CONFIG.patchPreviewUrl, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "\u8BFB\u53D6\u4FEE\u6539\u9884\u89C8\u5931\u8D25");
        return result.preview || null;
      }

      function patchPreviewVisible(preview) {
        return preview && (preview.status === "pending" || preview.status === "authorized")
          && typeof preview.xml === "string";
      }

      function setPatchPreviewControlsDisabled(disabled) {
        historyBtn.disabled = disabled;
        annBtn.disabled = disabled;
      }

      function patchPreviewValue(value) {
        return value === null || value === undefined || value === "" ? "\uFF08\u672A\u8BBE\u7F6E\uFF09" : String(value);
      }

      function appendPatchPreviewProperty(container, property, before, after) {
        const row = document.createElement("div");
        row.className = "property";
        const name = document.createElement("strong");
        name.textContent = property;
        const beforeValue = document.createElement("span");
        beforeValue.className = "value";
        beforeValue.textContent = patchPreviewValue(before);
        const arrow = document.createElement("span");
        arrow.textContent = "\u2192";
        const afterValue = document.createElement("span");
        afterValue.className = "value";
        afterValue.textContent = patchPreviewValue(after);
        row.append(name, beforeValue, arrow, afterValue);
        if (/color|background/i.test(property)) {
          for (const [value, target] of [[before, beforeValue], [after, afterValue]]) {
            if (!value) continue;
            const swatch = document.createElement("i");
            swatch.className = "color";
            swatch.style.backgroundColor = String(value);
            target.prepend(swatch, " ");
          }
        }
        container.appendChild(row);
      }

      function renderPatchPreviewDetails(preview) {
        patchPreviewDetailsBody.replaceChildren();
        const diff = preview?.diff || {};
        for (const [kind, entries] of [["\u65B0\u589E", diff.added || []], ["\u5220\u9664", diff.removed || []]]) {
          for (const change of entries) {
            const section = document.createElement("div");
            section.className = "change";
            const title = document.createElement("strong");
            title.textContent = kind + (change.cell?.edge ? "\u8FDE\u7EBF " : "\u56FE\u5143 ")
              + (change.cell?.id || change.key || "");
            section.appendChild(title);
            patchPreviewDetailsBody.appendChild(section);
          }
        }
        for (const change of diff.changed || []) {
          const section = document.createElement("div");
          section.className = "change";
          const title = document.createElement("strong");
          title.textContent = (change.kind === "edge" ? "\u8FDE\u7EBF " : "\u56FE\u5143 ")
            + (change.cellId || change.key || "");
          section.appendChild(title);
          if (change.labelChange) {
            appendPatchPreviewProperty(section, "label", change.labelChange.before, change.labelChange.after);
          }
          for (const style of change.styleChanges || []) {
            appendPatchPreviewProperty(section, style.property, style.before, style.after);
          }
          for (const geometry of change.geometryChanges || []) {
            appendPatchPreviewProperty(section, geometry.property, geometry.before, geometry.after);
          }
          patchPreviewDetailsBody.appendChild(section);
        }
        for (const change of diff.pageChanges || []) {
          const section = document.createElement("div");
          section.className = "change";
          const title = document.createElement("strong");
          title.textContent = "\u9875\u9762 " + (change.pageName || change.pageId);
          section.appendChild(title);
          appendPatchPreviewProperty(section, change.property, change.before, change.after);
          patchPreviewDetailsBody.appendChild(section);
        }
        const count = patchPreviewDetailsBody.childElementCount;
        patchPreviewDetailsCount.textContent = String(count);
        patchPreviewDetailsToggle.disabled = count === 0;
        setPatchPreviewDetailsExpanded(count > 0 && patchPreviewDetailsExpanded);
      }

      function setPatchPreviewDetailsExpanded(expanded) {
        patchPreviewDetailsExpanded = expanded;
        patchPreviewDetails.classList.toggle("visible", expanded);
        patchPreviewDetailsToggle.setAttribute("aria-expanded", String(expanded));
      }

      function updatePatchPreviewViewButtons(view) {
        patchPreviewBefore.classList.toggle("active", view === "before");
        patchPreviewAfter.classList.toggle("active", view === "after");
        patchPreviewCompare.classList.toggle("active", view === "compare");
        patchPreviewBefore.setAttribute("aria-pressed", String(view === "before"));
        patchPreviewAfter.setAttribute("aria-pressed", String(view === "after"));
        patchPreviewCompare.setAttribute("aria-pressed", String(view === "compare"));
      }

      function setPatchPreviewView(view) {
        if (!activePatchPreview || !editorReady) return;
        const xml = view === "before"
          ? activePatchPreview.beforePreviewXml
          : view === "after"
            ? activePatchPreview.candidateXml || activePatchPreview.afterPreviewXml
            : activePatchPreview.comparePreviewXml || activePatchPreview.xml;
        if (typeof xml !== "string" || !xml) return;
        patchPreviewView = view;
        previewTargetXml = xml;
        editorMode = "preview-loading";
        updatePatchPreviewViewButtons(view);
        sendEditor({ action: "load", xml, autosave: 0, diffSync: false,
          title: CONFIG.file + ({ before: " \xB7 \u4FEE\u6539\u524D", after: " \xB7 \u4FEE\u6539\u540E", compare: " \xB7 \u4FEE\u6539\u5BF9\u6BD4" }[view]) });
      }

      async function showPatchPreview(preview) {
        if (!patchPreviewVisible(preview) || !editorReady) return;
        if (activePatchPreview?.id === preview.id
          && (editorMode === "preview-loading" || editorMode === "previewing")) {
          activePatchPreview = preview;
          patchPreviewGuidance.textContent = preview.status === "authorized"
            ? "\u5DF2\u6279\u51C6\uFF0C\u6B63\u5728\u63D0\u4EA4\u7CBE\u786E\u5019\u9009"
            : "\u8BF7\u6838\u5BF9\u753B\u5E03\u540E\u5728 OpenCode question \u5F39\u7A97\u4E2D\u786E\u8BA4\u3001\u53D6\u6D88\u6216\u586B\u5199\u4FEE\u6539\u610F\u89C1";
          return;
        }
        await saveChain;
        if (editorMode !== "editing") {
          showStatus("\u4FEE\u6539\u9884\u89C8\u5DF2\u5C31\u7EEA\uFF1B\u8BF7\u5148\u5B8C\u6210\u5F53\u524D\u6062\u590D\u6216\u51B2\u7A81\u5904\u7406", 5000);
          return;
        }
        const latest = await readLatest();
        if (latest.revision !== preview.baseRevision) {
          showStatus("\u4FEE\u6539\u9884\u89C8\u57FA\u7EBF\u5DF2\u53D8\u5316\uFF0C\u7B49\u5F85 Agent \u91CD\u65B0\u751F\u6210", 4200);
          return;
        }
        if (lastEditorXml && current?.xml && !historyXmlEquals(lastEditorXml, current.xml)) {
          showStatus("\u68C0\u6D4B\u5230\u5C1A\u672A\u540C\u6B65\u7684\u4EBA\u5DE5\u7F16\u8F91\uFF0C\u6682\u4E0D\u8986\u76D6\u5F53\u524D\u753B\u5E03", 5000);
          return;
        }
        current = latest;
        canvasRevision = latest.revision;
        activePatchPreview = preview;
        patchPreviewView = "compare";
        patchPreviewDetailsExpanded = true;
        previewTargetXml = preview.comparePreviewXml || preview.xml;
        previewExitXml = null;
        editorMode = "preview-loading";
        updatePatchPreviewViewButtons("compare");
        renderPatchPreviewDetails(preview);
        closeDrawer();
        closeHistory();
        setPatchPreviewControlsDisabled(true);
        const totalChanges = patchPreviewDetailsBody.childElementCount;
        patchPreviewSummary.textContent = totalChanges + " \u9879\u53D8\u5316 \xB7 \u57FA\u4E8E\u7248\u672C " + preview.baseRevision;
        patchPreviewGuidance.textContent = preview.status === "authorized"
          ? "\u5DF2\u6279\u51C6\uFF0C\u6B63\u5728\u63D0\u4EA4\u7CBE\u786E\u5019\u9009"
          : "\u8BF7\u6838\u5BF9\u753B\u5E03\u540E\u5728 OpenCode question \u5F39\u7A97\u4E2D\u786E\u8BA4\u3001\u53D6\u6D88\u6216\u586B\u5199\u4FEE\u6539\u610F\u89C1";
        patchPreviewBar.classList.add("visible");
        sendEditor({ action: "load", xml: previewTargetXml, autosave: 0, diffSync: false,
          title: CONFIG.file + " \xB7 Agent \u4FEE\u6539\u5BF9\u6BD4" });
      }

      async function leavePatchPreview(reloadLatest = true) {
        if (!reloadLatest) {
          activePatchPreview = null;
          previewTargetXml = null;
          previewExitXml = null;
          editorMode = "editing";
          patchPreviewBar.classList.remove("visible");
          patchPreviewDetails.classList.remove("visible");
          patchPreviewDetailsToggle.setAttribute("aria-expanded", "false");
          setPatchPreviewControlsDisabled(false);
          return;
        }
        const latest = await readLatest();
        current = latest;
        canvasRevision = latest.revision;
        previewTargetXml = null;
        previewExitXml = latest.xml;
        editorMode = "preview-exiting";
        sendEditor({ action: "load", xml: latest.xml, autosave: 1, diffSync: true, title: CONFIG.file });
      }

      function confirmPatchPreviewLoad(xml) {
        if (editorMode === "preview-loading" && previewTargetXml
          && historyXmlEquals(xml, previewTargetXml)) {
          previewTargetXml = null;
          editorMode = "previewing";
          showStatus("\u5DF2\u52A0\u8F7D\u53EA\u8BFB\u4FEE\u6539\u9884\u89C8", 1800);
          return true;
        }
        if (editorMode === "preview-exiting" && previewExitXml
          && historyXmlEquals(xml, previewExitXml)) {
          lastEditorXml = previewExitXml;
          previewExitXml = null;
          activePatchPreview = null;
          editorMode = "editing";
          patchPreviewBar.classList.remove("visible");
          patchPreviewDetails.classList.remove("visible");
          patchPreviewDetailsToggle.setAttribute("aria-expanded", "false");
          setPatchPreviewControlsDisabled(false);
          showStatus("\u5DF2\u8FD4\u56DE\u6B63\u5F0F\u56FE\u8868", 1800);
          return true;
        }
        return false;
      }

      async function refreshPatchPreview() {
        const preview = await readPatchPreview();
        if (patchPreviewVisible(preview)) {
          await showPatchPreview(preview);
          return;
        }
        if (editorMode === "preview-loading" || editorMode === "previewing") {
          await leavePatchPreview(true);
        }
        if (preview?.statusReason) showStatus(preview.statusReason, 4200);
      }

      async function cancelVisiblePatchPreview() {
        if (!activePatchPreview) return;
        const cancelUrl = new URL(CONFIG.patchPreviewUrl);
        cancelUrl.pathname = cancelUrl.pathname.endsWith("/")
          ? cancelUrl.pathname + encodeURIComponent(activePatchPreview.id)
          : cancelUrl.pathname + "/" + encodeURIComponent(activePatchPreview.id);
        const response = await fetch(cancelUrl.toString(), { method: "DELETE" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "\u53D6\u6D88\u9884\u89C8\u5931\u8D25");
        await leavePatchPreview(true);
      }

      async function writeState(xml, baseRevision) {
        const response = await fetch(CONFIG.apiUrl, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ xml, baseRevision, source: "editor", clientId }),
        });
        const result = await response.json();
        if (response.status === 409) {
          // Never blind-retry the same old XML with the server's new revision:
          // that could overwrite content another writer just produced. Surface
          // the conflict and let the user choose to reload the latest version.
          const error = new Error(result.error || "\u56FE\u8868\u521A\u53D1\u751F\u53D8\u5316\uFF0C\u8BF7\u68C0\u67E5\u6700\u65B0\u7248\u672C\u540E\u91CD\u65B0\u786E\u8BA4");
          error.status = 409;
          error.current = result.current;
          error.merge = result.merge;
          error.localXml = xml;
          error.baseRevision = baseRevision;
          throw error;
        }
        if (!response.ok) throw new Error(result.error || "\u4FDD\u5B58\u56FE\u8868\u5931\u8D25");
        return result;
      }

      function queueSave(xml) {
        saveChain = saveChain.then(async () => {
          if (editorMode === "preview-loading" || editorMode === "previewing" || editorMode === "preview-exiting") return;
          if (editorMode === "restoring" || editorMode === "loading-restored-xml") return;
          if (editorMode === "conflict") {
            if (pendingConflict && typeof xml === "string") pendingConflict.xml = xml;
            return;
          }
          if (typeof xml !== "string" || xml === current?.xml) return;
          const submittedXml = xml;
          const submittedRevision = canvasRevision;
          const result = await writeState(submittedXml, submittedRevision);
          const editorAdvanced = lastEditorXml !== submittedXml;
          current = result;
          if (result.autoMerge?.status === "merged") {
            showConflictBanner(
              "\u5DF2\u81EA\u52A8\u5408\u5E76\u4E0D\u91CD\u53E0\u4FEE\u6539\u5E76\u4FDD\u5B58 revision " + result.revision
                + "\u3002\u4E3A\u4FDD\u62A4\u53EF\u80FD\u4ECD\u5728\u8F93\u5165\u7684\u5185\u5BB9\uFF0C\u5F53\u524D\u753B\u5E03\u6CA1\u6709\u81EA\u52A8\u5237\u65B0\uFF1B\u53EF\u5728\u7F16\u8F91\u5B8C\u6210\u540E\u52A0\u8F7D\u5408\u5E76\u7248\u672C\u3002",
              false,
              false,
            );
            showStatus("\u5DF2\u81EA\u52A8\u5408\u5E76\uFF1B\u4E3A\u4FDD\u62A4\u6B63\u5728\u8F93\u5165\u7684\u5185\u5BB9\uFF0C\u753B\u5E03\u672A\u5237\u65B0", 5000);
          } else {
            if (!editorAdvanced) canvasRevision = result.revision;
            showStatus("\u5DF2\u4FDD\u5B58 revision " + result.revision, 1000);
            conflictBanner.classList.remove("visible");
          }
        }).catch(error => {
          if (error && error.status === 409) {
            enterConflict(error.current, error.localXml, error.merge, undefined, false, error.baseRevision);
          } else {
            showStatus(error.message || "\u4FDD\u5B58\u5931\u8D25", 5000);
          }
        });
      }

      function showConflictBanner(message, showRetry, showOverwrite) {
        document.getElementById("conflict-message").textContent = message;
        document.getElementById("conflict-retry").style.display = showRetry ? "" : "none";
        document.getElementById("conflict-overwrite").style.display = showOverwrite ? "" : "none";
        conflictBanner.classList.add("visible");
      }

      function conflictFieldLabel(field) {
        const leaf = String(field).split(".").at(-1);
        return ({
          existence: "\u72B6\u6001",
          "@_value": "\u6587\u5B57",
          "@_style": "\u6837\u5F0F",
          "@_parent": "\u7236\u7EA7",
          "@_source": "\u8FDE\u7EBF\u8D77\u70B9",
          "@_target": "\u8FDE\u7EBF\u7EC8\u70B9",
          "@_x": "\u6A2A\u5750\u6807",
          "@_y": "\u7EB5\u5750\u6807",
          "@_width": "\u5BBD\u5EA6",
          "@_height": "\u9AD8\u5EA6",
          mxPoint: "\u6298\u70B9",
        })[leaf] || field;
      }

      function conflictFieldValue(entry) {
        if (!entry?.exists) return "\u5DF2\u5220\u9664 / \u4E0D\u5B58\u5728";
        if (entry.value === "") return "\uFF08\u7A7A\uFF09";
        if (entry.value === null) return "null";
        if (typeof entry.value === "object") return JSON.stringify(entry.value, null, 2);
        return String(entry.value);
      }

      function appendConflictVersion(container, title, className, fields, side) {
        const version = document.createElement("section");
        version.className = "conflict-version " + className;
        const heading = document.createElement("div");
        heading.className = "version-title";
        heading.textContent = title;
        version.appendChild(heading);
        for (const field of fields) {
          const row = document.createElement("div");
          row.className = "conflict-field";
          const name = document.createElement("span");
          name.className = "field-name";
          name.textContent = conflictFieldLabel(field.path);
          const value = document.createElement("span");
          value.className = "field-value";
          value.textContent = conflictFieldValue(field[side]);
          row.append(name, value);
          version.appendChild(row);
        }
        container.appendChild(version);
      }

      function showConflictModal(merge) {
        conflictDetails.replaceChildren();
        const details = merge?.status === "conflict" && Array.isArray(merge.details)
          ? merge.details
          : [];
        document.getElementById("conflict-title").textContent = details.length
          ? "\u53D1\u73B0 " + details.length + " \u5904\u7248\u672C\u51B2\u7A81"
          : "\u65E0\u6CD5\u81EA\u52A8\u5408\u5E76\u8FD9\u6B21\u4FEE\u6539";
        document.getElementById("conflict-subtitle").textContent = details.length
          ? "AI \u548C\u4F60\u4FEE\u6539\u4E86\u540C\u4E00\u56FE\u5143\u3002\u4E0B\u65B9\u53EA\u5C55\u793A\u53D1\u751F\u51B2\u7A81\u7684\u5B57\u6BB5\uFF0C\u5F53\u524D\u753B\u5E03\u4ECD\u4FDD\u7559\u4F60\u7684\u7248\u672C\u3002"
          : "\u5F53\u524D\u4FEE\u6539\u6D89\u53CA\u9875\u9762\u7ED3\u6784\u6216\u7F3A\u5C11\u5408\u5E76\u57FA\u7EBF\uFF0C\u7CFB\u7EDF\u6CA1\u6709\u8986\u76D6\u4EFB\u4F55\u4E00\u65B9\u3002";
        if (!details.length) {
          const empty = document.createElement("div");
          empty.className = "conflict-card";
          const title = document.createElement("div");
          title.className = "conflict-card-title";
          title.textContent = merge?.reason || "\u8BF7\u5728\u4FDD\u7559\u5F53\u524D\u753B\u5E03\u548C\u52A0\u8F7D AI \u6700\u65B0\u7248\u672C\u4E4B\u95F4\u9009\u62E9\u3002";
          empty.appendChild(title);
          conflictDetails.appendChild(empty);
        }
        for (const detail of details) {
          const card = document.createElement("article");
          card.className = "conflict-card";
          const title = document.createElement("div");
          title.className = "conflict-card-title";
          const strong = document.createElement("strong");
          strong.textContent = (detail.pageName || detail.pageId) + " \xB7 "
            + (detail.user?.label || detail.agent?.label || "\u672A\u547D\u540D\u56FE\u5143");
          const code = document.createElement("code");
          code.textContent = detail.key;
          title.append(strong, code);
          const columns = document.createElement("div");
          columns.className = "conflict-columns";
          const fields = detail.fields?.length ? detail.fields : [{
            path: "existence",
            user: { exists: detail.user?.exists, value: detail.user },
            agent: { exists: detail.agent?.exists, value: detail.agent },
          }];
          appendConflictVersion(columns, "\u6211\u7684\u672A\u4FDD\u5B58\u7248\u672C", "user", fields, "user");
          appendConflictVersion(columns, "AI \u5DF2\u4FDD\u5B58\u7248\u672C", "agent", fields, "agent");
          card.append(title, columns);
          conflictDetails.appendChild(card);
        }
        conflictBanner.classList.remove("visible");
        conflictModal.classList.add("open");
      }

      function enterConflict(latest, localXml, merge, message, showRetry, baseRevision) {
        editorMode = "conflict";
        pendingConflict = localXml && latest ? {
          xml: localXml,
          originalXml: localXml,
          baseRevision: Number.isInteger(baseRevision) ? baseRevision : canvasRevision,
          latest,
          merge,
        } : null;
        if (pendingConflict) {
          showConflictModal(merge);
          void refreshAnnotations();
          showStatus("\u4FDD\u5B58\u51B2\u7A81\uFF1A\u753B\u5E03\u4ECD\u4FDD\u7559\u4F60\u7684\u672A\u4FDD\u5B58\u7248\u672C", 6000);
          return;
        }
        const overlap = merge?.status === "conflict" && merge.conflicts?.length
          ? "\u91CD\u53E0\u56FE\u5143\uFF1A" + merge.conflicts.join("\u3001") + "\u3002"
          : "";
        showConflictBanner(
          message || ("\u68C0\u6D4B\u5230\u91CD\u53E0\u4FEE\u6539\uFF0C\u672A\u8986\u76D6\u670D\u52A1\u7AEF\u7248\u672C\u3002" + overlap + "\u8BF7\u9009\u62E9\u4FDD\u7559\u54EA\u4E00\u7248\u3002"),
          !!showRetry,
          !!pendingConflict,
        );
        void refreshAnnotations();
        if (latest) showStatus("\u4FDD\u5B58\u51B2\u7A81\uFF1A\u56FE\u8868\u521A\u53D1\u751F\u53D8\u5316\uFF0C\u5DF2\u4FDD\u7559\u4F60\u7684\u672C\u5730\u753B\u5E03\uFF08revision " + (current?.revision ?? 0) + "\uFF0C\u6700\u65B0 revision " + latest.revision + "\uFF09", 6000);
      }

      function setConflictResolutionBusy(busy) {
        document.getElementById("conflict-modal-reload").disabled = busy;
        document.getElementById("conflict-modal-overwrite").disabled = busy;
      }

      async function resolveConflict(choice) {
        setConflictResolutionBusy(true);
        try {
          await saveChain;
          const pending = pendingConflict;
          if (!pending) return;
          if (pending.xml !== pending.originalXml) {
            try {
              const refreshed = await writeState(pending.xml, pending.baseRevision);
              current = refreshed;
              canvasRevision = refreshed.revision;
              lastEditorXml = refreshed.xml;
              pendingConflict = null;
              editorMode = "editing";
              conflictModal.classList.remove("open");
              sendEditor({ action: "load", xml: refreshed.xml, autosave: 1, diffSync: true, title: CONFIG.file });
              showStatus("\u5DF2\u5408\u5E76\u4FDD\u5B58\u51B2\u7A81\u671F\u95F4\u7684\u6700\u65B0\u7F16\u8F91 \xB7 revision " + refreshed.revision, 3000);
              return;
            } catch (error) {
              if (error && error.status === 409) {
                enterConflict(
                  error.current,
                  error.localXml,
                  error.merge,
                  undefined,
                  false,
                  error.baseRevision,
                );
                return;
              }
              throw error;
            }
          }
          const candidate = choice === "user"
            ? pending.merge?.userResolutionXml || pending.xml
            : pending.merge?.agentResolutionXml || pending.latest.xml;
          const result = await writeState(candidate, pending.latest.revision);
          current = result;
          canvasRevision = result.revision;
          lastEditorXml = result.xml;
          pendingConflict = null;
          editorMode = "editing";
          conflictBanner.classList.remove("visible");
          conflictModal.classList.remove("open");
          sendEditor({ action: "load", xml: result.xml, autosave: 1, diffSync: true, title: CONFIG.file });
          showStatus(
            (choice === "user" ? "\u5DF2\u4FDD\u7559\u4F60\u7684\u51B2\u7A81\u4FEE\u6539" : "\u5DF2\u4FDD\u7559 AI \u7684\u51B2\u7A81\u4FEE\u6539")
              + "\uFF0C\u53CC\u65B9\u975E\u51B2\u7A81\u4FEE\u6539\u5747\u5DF2\u5408\u5E76 \xB7 revision " + result.revision,
            4000,
          );
          void refreshAnnotations();
        } catch (error) {
          if (error && error.status === 409) {
            enterConflict(
              error.current,
              error.localXml,
              error.merge,
              undefined,
              false,
              error.baseRevision,
            );
          } else {
            showStatus(error.message || "\u4FDD\u5B58\u56FE\u8868\u5931\u8D25", 5000);
          }
        } finally {
          setConflictResolutionBusy(false);
        }
      }

      async function reloadLatest() {
        await saveChain;
        try {
          const latest = await readLatest();
          current = latest;
          canvasRevision = latest.revision;
          lastEditorXml = latest.xml;
          editorMode = "editing";
          clearTimeout(restoreLoadTimer);
          restoreTargetXml = null;
          preRestoreXml = null;
          pendingRestore = null;
          pendingConflict = null;
          conflictBanner.classList.remove("visible");
          conflictModal.classList.remove("open");
          sendEditor({ action: "load", xml: latest.xml, autosave: 1, diffSync: true, title: CONFIG.file });
          showStatus("\u5DF2\u52A0\u8F7D\u6700\u65B0\u7248\u672C revision " + latest.revision, 2000);
          void refreshAnnotations();
        } catch (error) {
          showStatus(error.message || "\u8BFB\u53D6\u6700\u65B0\u7248\u672C\u5931\u8D25", 5000);
        }
      }

      function retryRestoreLoad() {
        if (!pendingRestore) { void reloadLatest(); return; }
        conflictBanner.classList.remove("visible");
        editorMode = "loading-restored-xml";
        restoreTargetXml = pendingRestore.xml;
        sendEditor({ action: "load", xml: pendingRestore.xml, autosave: 1, diffSync: true, title: CONFIG.file });
        clearTimeout(restoreLoadTimer);
        restoreLoadTimer = setTimeout(() => {
          if (editorMode !== "loading-restored-xml") return;
          editorMode = "conflict";
          restoreTargetXml = null;
          showConflictBanner("\u6062\u590D\u5185\u5BB9\u52A0\u8F7D\u8D85\u65F6\uFF0C\u8BF7\u786E\u8BA4\u6700\u65B0\u7248\u672C\uFF1B\u53EF\u91CD\u8BD5\u52A0\u8F7D\u6216\u91CD\u65B0\u52A0\u8F7D\u670D\u52A1\u7AEF\u5F53\u524D\u7248\u672C\u3002", true);
        }, 15000);
      }

      async function applyExternalRevision(revision) {
        await saveChain;
        // Keep the user's canvas on its current base when Agent/external writes
        // arrive. A forced reload here can erase an in-progress label edit
        // before Draw.io emits its autosave. The next user save will perform the
        // conservative three-way merge or enter the explicit conflict flow.
        if (editorMode !== "editing") return;
        if (revision <= (current?.revision ?? 0)) return;
        showConflictBanner(
          "Agent \u5DF2\u4FDD\u5B58\u65B0\u7248\u672C revision " + revision + "\u3002\u5F53\u524D\u753B\u5E03\u672A\u88AB\u5F3A\u5236\u5237\u65B0\uFF1B\u7EE7\u7EED\u7F16\u8F91\u5E76\u4FDD\u5B58\u65F6\u4F1A\u81EA\u52A8\u5408\u5E76\uFF0C\u91CD\u53E0\u4FEE\u6539\u4F1A\u63D0\u793A\u51B2\u7A81\u3002",
          false,
          false,
        );
        showStatus("\u68C0\u6D4B\u5230 Agent \u66F4\u65B0 \xB7 \u5F53\u524D\u753B\u5E03\u4FDD\u6301\u4E0D\u53D8", 5000);
        void refreshAnnotations();
      }

      /* === TESTABLE HISTORY SAVE DECISION START === */
      function normalizeHistoryXml(value) {
        return String(value).replace(/>\\s+</g, "><").trim();
      }
      function historyXmlEquals(a, b) {
        return normalizeHistoryXml(a) === normalizeHistoryXml(b);
      }
      // Decide what to do with an incoming autosave/save message:
      //   "queue"   -> safe to enqueue a normal save
      //   "confirm" -> the editor confirmed it loaded the restore target
      //   "drop"    -> ignore (late pre-restore autosave or unreconciled copy)
      // While loading the restored XML, ONLY a message equal to the restore
      // target counts as confirmation. Nothing else may enter the save queue,
      // so a late autosave from the old canvas can never overwrite the restore.
      function decideHistoryAutosave(mode, xml, restoreTargetXml) {
        if (mode === "restoring" || mode === "conflict") return "drop";
        if (mode === "loading-restored-xml") {
          if (restoreTargetXml && historyXmlEquals(xml, restoreTargetXml)) return "confirm";
          return "drop";
        }
        return "queue";
      }
      /* === TESTABLE HISTORY SAVE DECISION END === */

      function confirmRestoreTargetLoaded(xml) {
        if (editorMode !== "loading-restored-xml"
          || !restoreTargetXml
          || !historyXmlEquals(xml, restoreTargetXml)) return false;
        editorMode = "editing";
        clearTimeout(restoreLoadTimer);
        restoreLoadTimer = null;
        restoreTargetXml = null;
        preRestoreXml = null;
        pendingRestore = null;
        conflictBanner.classList.remove("visible");
        return true;
      }

      function historySourceLabel(source) {
        return ({ initial: "\u521D\u59CB\u7248\u672C", editor: "\u7528\u6237\u7F16\u8F91", agent: "Agent \u4FEE\u6539", external: "\u5916\u90E8\u4FEE\u6539", restore: "\u5386\u53F2\u6062\u590D" }[source] || source);
      }

      function relativeTime(iso) {
        const elapsed = Date.now() - new Date(iso).getTime();
        if (elapsed < 60000) return "\u521A\u521A";
        if (elapsed < 3600000) return Math.floor(elapsed / 60000) + " \u5206\u949F\u524D";
        if (elapsed < 86400000) return Math.floor(elapsed / 3600000) + " \u5C0F\u65F6\u524D";
        return Math.floor(elapsed / 86400000) + " \u5929\u524D";
      }

      function previewUrl(snapshotId, pageId, mode) {
        const url = new URL(CONFIG.historyUrl);
        url.pathname = "/api/history/" + encodeURIComponent(snapshotId) + "/preview";
        url.searchParams.set("pageId", pageId);
        url.searchParams.set("mode", mode);
        return url.toString();
      }

      function wrapThumb(snapshotId, pageId) {
        const img = document.createElement("img");
        img.dataset.snapshot = snapshotId;
        img.dataset.page = pageId;
        img.dataset.src = previewUrl(snapshotId, pageId, "thumb");
        img.alt = "\u7F29\u7565\u56FE";
        return img;
      }

      async function openHistory() {
        if (editorMode !== "editing") return;
        closeDrawer();
        historyOpen = true;
        histModal.classList.add("open");
        histModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        document.getElementById("hist-close").focus();
        // Let the last debounced autosave land before asking the server to flush.
        await saveChain;
        await new Promise(resolve => setTimeout(resolve, 300));
        await saveChain;
        await refreshHistoryList();
      }

      function closeHistory() {
        if (!historyOpen && !histModal.classList.contains("open")) {
          histModal.classList.remove("open");
          histModal.setAttribute("aria-hidden", "true");
          return;
        }
        historyOpen = false;
        selectedSnapshot = null;
        confirmSnapshot = null;
        histConfirm.classList.remove("open");
        histConfirm.setAttribute("aria-hidden", "true");
        histModal.classList.remove("open");
        histModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        // Only a normal editing state is restored when the modal closes. A
        // conflict (e.g. a restore load timeout) must survive, otherwise a
        // late pre-restore autosave could be re-admitted to the save queue.
        if (editorMode === "editing" || editorMode === "opening-history") {
          editorMode = "editing";
        }
        if (editorMode !== "conflict") {
          conflictBanner.classList.remove("visible");
        }
        historyBtn.focus();
      }

      function showHistoryError(message, withReload) {
        histNote.innerHTML = "";
        const box = document.createElement("span");
        box.className = "h-msg error";
        box.textContent = message;
        if (withReload) {
          const reload = document.createElement("button");
          reload.type = "button";
          reload.textContent = "\u91CD\u65B0\u52A0\u8F7D\u6700\u65B0\u7248\u672C";
          reload.addEventListener("click", () => void reloadLatestFromHistory());
          box.appendChild(reload);
        }
        histNote.appendChild(box);
      }

      function clearHistoryError() {
        histNote.textContent = "\u6062\u590D\u4F1A\u521B\u5EFA\u65B0\u7248\u672C\uFF0C\u5F53\u524D\u7248\u672C\u4E0D\u4F1A\u88AB\u5220\u9664\u3002";
      }

      async function refreshHistoryList() {
        clearHistoryError();
        histList.innerHTML = Array(3).fill(
          '<div class="h-list-skeleton"><div class="ln" style="width:80%"></div><div class="ln" style="width:60%"></div><div class="ln" style="width:40%"></div></div>'
        ).join("");
        histRestore.disabled = true;
        try {
          const response = await fetch(CONFIG.historyUrl, { cache: "no-store" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "\u8BFB\u53D6\u5386\u53F2\u5931\u8D25");
          renderHistoryList(result.entries || []);
          if (result.historyWarning) {
            const warning = document.createElement("div");
            warning.className = "h-msg error";
            warning.textContent = result.historyWarning;
            warning.style.marginBottom = "10px";
            histList.prepend(warning);
          }
        } catch (error) {
          histList.innerHTML = '<div class="h-card" style="cursor:default"><div class="h-meta"><div style="color:#94a3b8">\u5386\u53F2\u52A0\u8F7D\u5931\u8D25</div><div style="font-size:11px;color:#64748b">' + escapeHtml(error.message || "") + '</div></div></div>';
        }
      }

      function escapeHtml(value) {
        return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
      }

      function renderHistoryList(entries) {
        if (entries.length === 0) {
          histList.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:24px 8px">\u8FD8\u6CA1\u6709\u5386\u53F2\u7248\u672C\u3002\u4FDD\u5B58\u56FE\u8868\u540E\u8FD9\u91CC\u4F1A\u51FA\u73B0\u53EF\u6062\u590D\u7684\u7248\u672C\u3002</div>';
          return;
        }
        histList.innerHTML = entries.map((entry) => {
          const currentBadge = entry.isCurrent ? '<span class="h-badge cur">\u5F53\u524D\u7248\u672C</span>' : "";
          const badges = '<span class="h-badge ' + entry.source + '">' + escapeHtml(historySourceLabel(entry.source)) + '</span>';
          const pages = entry.pages && entry.pages.length > 1 ? '<span class="h-pages">\xB7 ' + entry.pages.length + ' \u9875</span>' : "";
          const restored = entry.restoredFromSequence ? '<div class="h-restored">\u6062\u590D\u81EA v' + entry.restoredFromSequence + '</div>' : "";
          const time = '<span class="h-time" title="' + escapeHtml(entry.createdAt) + '">' + relativeTime(entry.createdAt) + '</span>';
          const firstPageId = escapeHtml(entry.pages?.[0]?.id || "");
          const thumb = entry.previewState === "failed" || entry.previewState === "unavailable"
            ? '<div class="ph" data-snapshot="' + entry.id + '" data-page="' + firstPageId + '">\u9884\u89C8\u4E0D\u53EF\u7528\uFF0C<br>\u53EF\u91CD\u8BD5</div>'
            : '<img data-src="' + previewUrl(entry.id, entry.pages?.[0]?.id || "", "thumb") + '" data-snapshot="' + entry.id + '" data-page="' + firstPageId + '" alt="v' + entry.sequence + ' \u7F29\u7565\u56FE">';
          return '<div class="h-card' + (entry.isCurrent ? " current" : "") + '" data-id="' + entry.id + '" data-sequence="' + entry.sequence + '">'
            + '<div class="h-thumb">' + thumb + '</div>'
            + '<div class="h-meta"><div class="h-ver">v' + entry.sequence + '</div>'
            + '<div class="h-badges">' + currentBadge + badges + '</div>'
            + '<div>' + time + pages + '</div>' + restored + '</div></div>';
        }).join("");

        // lazy-load visible thumbnails; failed thumbnails offer click-to-retry
        // with the original snapshot id and page id (never a silent p1 fallback)
        const wireThumb = (img) => {
          if (img.dataset.loaded) return;
          const snapshot = img.dataset.snapshot;
          const page = img.dataset.page;
          img.addEventListener("error", () => {
            const ph = document.createElement("div");
            ph.className = "ph";
            ph.dataset.snapshot = snapshot;
            ph.dataset.page = page;
            ph.textContent = "\u9884\u89C8\u4E0D\u53EF\u7528\uFF0C\u53EF\u91CD\u8BD5";
            ph.title = "\u70B9\u51FB\u91CD\u8BD5";
            ph.addEventListener("click", (event) => {
              event.stopPropagation();
              const replacement = wrapThumb(snapshot, page);
              img.replaceWith(replacement);
              wireThumb(replacement);
            });
            img.replaceWith(ph);
          });
          img.src = img.dataset.src;
          img.dataset.loaded = "1";
        };
        histList.querySelectorAll(".h-thumb img").forEach(wireThumb);
        histList.querySelectorAll(".h-thumb .ph").forEach((ph) => {
          ph.title = "\u70B9\u51FB\u91CD\u8BD5";
          ph.addEventListener("click", (event) => {
            event.stopPropagation();
            const snapshot = ph.dataset.snapshot || "";
            const page = ph.dataset.page || "";
            if (!snapshot) return;
            const replacement = wrapThumb(snapshot, page);
            ph.replaceWith(replacement);
            wireThumb(replacement);
          });
        });

        // re-select previously selected card
        if (selectedSnapshot) {
          const card = histList.querySelector('[data-id="' + selectedSnapshot.id + '"]');
          if (card) card.classList.add("selected");
          updateRestoreButton();
        }
      }

      function selectHistoryCard(entry) {
        selectedSnapshot = entry;
        histList.querySelectorAll(".h-card").forEach((card) => {
          card.classList.toggle("selected", card.getAttribute("data-id") === entry.id);
        });
        const pages = entry.pages || [];
        histPage.innerHTML = "";
        histPage.disabled = pages.length === 0;
        pages.forEach((page) => {
          const option = document.createElement("option");
          option.value = page.id;
          option.textContent = page.name || page.id;
          histPage.appendChild(option);
        });
        updateRestoreButton();
        if (pages.length > 0) void loadPagePreview(entry.id, pages[0].id);
      }

      function updateRestoreButton() {
        histRestore.disabled = !(selectedSnapshot && !selectedSnapshot.isCurrent);
      }

      function loadPagePreview(snapshotId, pageId) {
        histPreview.innerHTML = '<div class="ph">\u9884\u89C8\u751F\u6210\u4E2D\u2026</div>';
        const img = new Image();
        const url = previewUrl(snapshotId, pageId, "preview");
        img.addEventListener("load", () => {
          histPreview.innerHTML = "";
          img.style.maxWidth = "100%";
          img.style.maxHeight = "100%";
          histPreview.appendChild(img);
        });
        img.addEventListener("error", () => {
          const box = document.createElement("div");
          box.className = "ph";
          box.textContent = "\u9884\u89C8\u4E0D\u53EF\u7528\uFF0C\u53EF\u91CD\u8BD5";
          const retry = document.createElement("button");
          retry.type = "button";
          retry.textContent = "\u91CD\u8BD5";
          retry.addEventListener("click", () => void loadPagePreview(snapshotId, pageId));
          box.appendChild(document.createElement("br"));
          box.appendChild(retry);
          histPreview.innerHTML = "";
          histPreview.appendChild(box);
        });
        img.src = url;
      }

      function showConfirmRestore() {
        if (!selectedSnapshot || selectedSnapshot.isCurrent) return;
        confirmSnapshot = selectedSnapshot;
        histConfirm.querySelector("p").textContent = "\u5C06\u56FE\u8868\u6062\u590D\u4E3A v" + selectedSnapshot.sequence + " \u7684\u5185\u5BB9\uFF1F";
        histConfirm.classList.add("open");
        histConfirm.setAttribute("aria-hidden", "false");
        document.getElementById("hist-confirm-cancel").focus();
      }

      function cancelConfirmRestore() {
        confirmSnapshot = null;
        histConfirm.classList.remove("open");
        histConfirm.setAttribute("aria-hidden", "true");
        if (histModal.classList.contains("open")) histRestore.focus();
      }

      async function confirmRestore() {
        if (!confirmSnapshot) return;
        await saveChain;
        editorMode = "restoring";
        restoreOverlay.classList.add("visible");
        restoreOverlay.setAttribute("aria-hidden", "false");
        histRestore.disabled = true;
        histConfirm.classList.remove("open");
        histConfirm.setAttribute("aria-hidden", "true");
        const snapshot = confirmSnapshot;
        confirmSnapshot = null;
        try {
          const url = new URL(CONFIG.historyUrl);
          url.pathname = "/api/history/" + encodeURIComponent(snapshot.id) + "/restore";
          const response = await fetch(url.toString(), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ baseRevision: current?.revision ?? 0, clientId }),
          });
          const result = await response.json();
          if (response.status === 409) {
            editorMode = "editing";
            showHistoryError("\u56FE\u8868\u521A\u53D1\u751F\u53D8\u5316\uFF0C\u8BF7\u52A0\u8F7D\u6700\u65B0\u7248\u672C\u540E\u91CD\u65B0\u786E\u8BA4\u3002", true);
            void refreshHistoryList();
            return;
          }
          if (!response.ok) {
            editorMode = "editing";
            if (response.status === 404) {
              showHistoryError("\u8BE5\u7248\u672C\u5DF2\u4E0D\u53EF\u7528\uFF0C\u5386\u53F2\u5217\u8868\u5DF2\u5237\u65B0\u3002", false);
              void refreshHistoryList();
            } else if (result.error === "current_checkpoint_failed") {
              showHistoryError("\u65E0\u6CD5\u5B89\u5168\u4FDD\u5B58\u5F53\u524D\u7248\u672C\uFF0C\u56E0\u6B64\u672A\u6267\u884C\u6062\u590D\u3002", false);
            } else {
              showHistoryError(result.detail || "\u8BE5\u7248\u672C\u65E0\u6CD5\u6062\u590D\uFF0C\u5F53\u524D\u753B\u5E03\u4FDD\u6301\u4E0D\u53D8\u3002", false);
            }
            return;
          }
          // Success: the returned XML is the only allowed load target.
          preRestoreXml = current?.xml || null;
          restoreTargetXml = result.xml;
          pendingRestore = { xml: result.xml };
          current = {
            revision: result.revision,
            xml: result.xml,
            updatedBy: result.updatedBy,
            updatedAt: result.updatedAt,
          };
          editorMode = "loading-restored-xml";
          sendEditor({ action: "load", xml: result.xml, autosave: 1, diffSync: true, title: CONFIG.file });
          clearTimeout(restoreLoadTimer);
          // The load confirmation is authoritative; the timer only guards
          // against a stuck editor. On timeout we enter an explicit conflict
          // state that keeps blocking old autosaves, never silent editing.
          restoreLoadTimer = setTimeout(() => {
            if (editorMode !== "loading-restored-xml") return;
            editorMode = "conflict";
            restoreTargetXml = null;
            showConflictBanner("\u6062\u590D\u5185\u5BB9\u52A0\u8F7D\u8D85\u65F6\uFF0C\u8BF7\u786E\u8BA4\u6700\u65B0\u7248\u672C\uFF1B\u53EF\u91CD\u8BD5\u52A0\u8F7D\u6216\u91CD\u65B0\u52A0\u8F7D\u670D\u52A1\u7AEF\u5F53\u524D\u7248\u672C\u3002", true);
          }, 15000);
          closeHistory();
          showStatus(result.partial
            ? "\u56FE\u8868\u5DF2\u6062\u590D\uFF0C\u4F46\u5386\u53F2\u8BB0\u5F55\u5F02\u5E38\uFF1A" + result.message
            : "\u5DF2\u6062\u590D\u4E3A v" + result.restoredFromSequence + " \u7684\u5185\u5BB9\uFF0C\u5DF2\u521B\u5EFA\u65B0\u7248\u672C v" + result.sequence, 5000);
          void refreshAnnotations();
        } catch (error) {
          editorMode = "editing";
          showHistoryError("\u7F51\u7EDC\u6216\u670D\u52A1\u6682\u65F6\u5931\u8D25\uFF1A" + (error.message || "\u672A\u77E5\u9519\u8BEF") + "\uFF0C\u8BF7\u91CD\u8BD5\u3002", false);
        } finally {
          restoreOverlay.classList.remove("visible");
          restoreOverlay.setAttribute("aria-hidden", "true");
        }
      }

      async function reloadLatestFromHistory() {
        await saveChain;
        try {
          const latest = await readLatest();
          current = latest;
          editorMode = "editing";
          sendEditor({ action: "load", xml: latest.xml, autosave: 1, diffSync: true, title: CONFIG.file });
          showStatus("\u5DF2\u52A0\u8F7D\u6700\u65B0\u7248\u672C revision " + latest.revision, 2000);
          await refreshHistoryList();
        } catch (error) {
          showHistoryError("\u8BFB\u53D6\u6700\u65B0\u7248\u672C\u5931\u8D25\uFF1A" + (error.message || "\u672A\u77E5\u9519\u8BEF"), true);
        }
      }

      function openDrawer() {
        if (editorMode !== "editing") return;
        closeHistory();
        annDrawer.classList.add("open");
        annDrawer.setAttribute("aria-hidden", "false");
        void refreshAnnotations();
      }

      function closeDrawer() {
        annDrawer.classList.remove("open");
        annDrawer.setAttribute("aria-hidden", "true");
        cancelAnnotationForm();
      }

      function startAnnotation() {
        if (editorMode !== "editing") {
          showStatus("\u8BF7\u5148\u9000\u51FA\u4FEE\u6539\u9884\u89C8\u6216\u5B8C\u6210\u5F53\u524D\u51B2\u7A81\u5904\u7406", 3600);
          return;
        }
        awaitingSelection = true;
        pendingSelection = null;
        annForm.classList.add("visible");
        annList.style.display = "none";
        annSelection.textContent = "\u6B63\u5728\u83B7\u53D6\u9009\u4E2D\u5185\u5BB9\u2026";
        annInstruction.value = "";
        const defaultScope = document.querySelector('input[name="ann-scope"][value="selection_only"]');
        if (defaultScope) defaultScope.checked = true;
        annSubmit.disabled = true;
        annInstruction.focus();
        sendEditor({ action: "export", format: "json", selection: true, currentPage: true, allPages: false });
      }

      function cancelAnnotationForm() {
        awaitingSelection = false;
        pendingSelection = null;
        annForm.classList.remove("visible");
        annList.style.display = "";
      }

      function applySelectionExport(data) {
        if (!awaitingSelection) return;
        awaitingSelection = false;
        const page = data && data.pages && data.pages[0] ? data.pages[0] : null;
        const cells = page && Array.isArray(page.cells)
          ? page.cells.filter((cell) => cell.type === "node" || cell.type === "edge")
          : [];
        if (!page || cells.length === 0) {
          pendingSelection = null;
          annSelection.textContent = "\u672A\u9009\u4E2D\u4EFB\u4F55\u56FE\u5143\u3002\u8BF7\u5728\u753B\u5E03\u4E0A\u6846\u9009\u4E00\u4E2A\u6216\u591A\u4E2A\u8282\u70B9\u6216\u8FDE\u7EBF\u540E\u518D\u6DFB\u52A0\u6CE8\u91CA\u3002";
          annSubmit.disabled = true;
          return;
        }
        pendingSelection = {
          pageId: page.id || "",
          pageName: page.name || "",
          cells: cells.map((cell) => ({
            id: cell.id,
            kind: cell.type === "edge" ? "edge" : "node",
            label: cell.label || "",
            source: cell.source,
            target: cell.target,
          })),
        };
        const labels = pendingSelection.cells
          .map((cell) => cell.label || cell.id)
          .slice(0, 5)
          .join("\u3001");
        const extra = pendingSelection.cells.length > 5 ? " \u7B49" : "";
        annSelection.textContent = "\u5DF2\u9009\u4E2D " + pendingSelection.cells.length + " \u4E2A\u56FE\u5143\uFF1A" + labels + extra;
        annSubmit.disabled = false;
      }

      async function submitAnnotation() {
        if (!pendingSelection) return;
        const instruction = annInstruction.value.trim();
        if (!instruction) { annInstruction.focus(); return; }
        const scope = selectedAnnotationScope();
        if (scope === "diagram_wide" && !window.confirm(
          "\u8FD9\u5C06\u5141\u8BB8 Agent \u4FEE\u6539\u5F53\u524D\u56FE\u8868\u7684\u6240\u6709\u9875\u9762\u3001\u8282\u70B9\u3001\u8FDE\u7EBF\u548C\u5E03\u5C40\u3002\u6B63\u5F0F\u5199\u5165\u524D\u4ECD\u4F1A\u5C55\u793A\u5177\u4F53\u8BA1\u5212\u5E76\u518D\u6B21\u8BF7\u6C42\u5BA1\u6279\u3002\u662F\u5426\u7EE7\u7EED\u63D0\u4EA4\uFF1F"
        )) return;
        annSubmit.disabled = true;
        try {
          await saveChain;
          const response = await fetch(CONFIG.annotationsUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ instruction, scope, pageId: pendingSelection.pageId, pageName: pendingSelection.pageName, cells: pendingSelection.cells }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "\u63D0\u4EA4\u6CE8\u91CA\u5931\u8D25");
          showStatus("\u6CE8\u91CA\u5DF2\u63D0\u4EA4", 1800);
          cancelAnnotationForm();
          await refreshAnnotations();
        } catch (error) {
          showStatus(error.message || "\u63D0\u4EA4\u6CE8\u91CA\u5931\u8D25", 5000);
          annSubmit.disabled = false;
        }
      }

      async function updateAnnotationStatus(id, nextStatus, button) {
        if (nextStatus === "ignored" && !window.confirm(
          "\u5FFD\u7565\u540E Agent \u5C06\u4E0D\u518D\u5904\u7406\u8FD9\u6761\u6CE8\u91CA\u3002\u4ECD\u53EF\u5728\u201C\u5DF2\u5FFD\u7565\u201D\u4E2D\u91CD\u65B0\u6253\u5F00\u3002\u662F\u5426\u7EE7\u7EED\uFF1F"
        )) return;
        if (button) button.disabled = true;
        try {
          const body = { status: nextStatus };
          if (nextStatus === "resolved") body.summary = "\u5DF2\u7531\u7528\u6237\u6807\u8BB0\u4E3A\u5DF2\u5B8C\u6210";
          if (nextStatus === "ignored") body.reason = "\u5DF2\u7531\u7528\u6237\u624B\u52A8\u5FFD\u7565";
          const statusUrl = new URL(CONFIG.annotationsUrl);
          statusUrl.pathname = statusUrl.pathname.endsWith("/")
            ? statusUrl.pathname + encodeURIComponent(id)
            : statusUrl.pathname + "/" + encodeURIComponent(id);
          const response = await fetch(statusUrl.toString(), {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "\u66F4\u65B0\u6CE8\u91CA\u72B6\u6001\u5931\u8D25");
          await refreshAnnotations();
        } catch (error) {
          showStatus(error.message || "\u66F4\u65B0\u6CE8\u91CA\u72B6\u6001\u5931\u8D25", 5000);
          if (button) button.disabled = false;
        }
      }

      async function refreshAnnotations() {
        try {
          const url = new URL(CONFIG.annotationsUrl);
          url.searchParams.set("status", annFilter.value || "pending");
          const response = await fetch(url.toString(), { cache: "no-store" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "\u8BFB\u53D6\u6CE8\u91CA\u5931\u8D25");
          renderAnnotations(result.annotations || [], result.counts || {});
        } catch (error) {
          showStatus(error.message || "\u8BFB\u53D6\u6CE8\u91CA\u5931\u8D25", 5000);
        }
      }

      function renderAnnotations(annotations, counts) {
        const pendingCount = Number(counts.pending || 0);
        annCount.textContent = String(pendingCount);
        annCount.classList.toggle("zero", pendingCount === 0);
        const filterLabels = {
          pending: "\u5F85\u5904\u7406", fresh: "\u672A\u5B8C\u6210", stale: "\u5DF2\u8FC7\u65F6",
          resolved: "\u5DF2\u5B8C\u6210", ignored: "\u5DF2\u5FFD\u7565", all: "\u5168\u90E8",
        };
        Object.entries(filterLabels).forEach(([value, label]) => {
          const option = annFilter.querySelector('option[value="' + value + '"]');
          if (option) option.textContent = label + "\uFF08" + Number(counts[value] || 0) + "\uFF09";
        });
        if (annotations.length === 0) {
          const emptyText = counts.all
            ? "\u5F53\u524D\u7B5B\u9009\u6761\u4EF6\u4E0B\u6CA1\u6709\u6CE8\u91CA\u3002"
            : "\u8FD8\u6CA1\u6709\u6CE8\u91CA\u3002\u6846\u9009\u56FE\u5143\u540E\u70B9\u51FB\u201C\u6DFB\u52A0\u6CE8\u91CA\u201D\uFF0C\u6807\u6CE8\u4F60\u8981\u8BA9 Agent \u4FEE\u6539\u7684\u5730\u65B9\u3002";
          annList.innerHTML = '<div id="ann-none">' + emptyText + '</div>';
          return;
        }
        const escape = (value) => String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
        annList.innerHTML = annotations.map((task) => {
          const status = task.effectiveStatus || (task.stale ? "stale" : task.status);
          const cells = (task.cells || []).map((cell) => escape(cell.label || cell.id)).join("\u3001");
          const region = task.region
            ? "\u533A\u57DF x=" + Math.round(task.region.x) + " y=" + Math.round(task.region.y)
              + " w=" + Math.round(task.region.width) + " h=" + Math.round(task.region.height)
            : "";
          const result = task.result
            ? '<div style="margin-top:6px;font-size:11px;color:#64748b">\u5904\u7406\u7ED3\u679C\uFF1A' + escape(task.result.summary || "") + "\uFF08revision " + task.result.revision + "\uFF09</div>"
            : "";
          const ignored = task.ignoredReason
            ? '<div style="margin-top:6px;font-size:11px;color:#64748b">\u5FFD\u7565\u539F\u56E0\uFF1A' + escape(task.ignoredReason) + '</div>'
            : "";
          const actions = task.status === "open"
            ? '<div class="item-actions"><button type="button" data-id="' + escape(task.id) + '" data-status="resolved">\u6807\u8BB0\u5DF2\u5B8C\u6210</button>'
              + '<button type="button" data-id="' + escape(task.id) + '" data-status="ignored">\u5FFD\u7565</button></div>'
            : '<div class="item-actions"><button type="button" data-id="' + escape(task.id) + '" data-status="open">\u91CD\u65B0\u6253\u5F00</button></div>';
          return '<div class="item ' + status + '">'
            + '<div class="meta"><span class="badge ' + status + '">' + ({ open: "\u672A\u5B8C\u6210", stale: "\u5DF2\u8FC7\u65F6", resolved: "\u5DF2\u5B8C\u6210", ignored: "\u5DF2\u5FFD\u7565" }[status] || status) + '</span>'
            + '<span>\u9875\u9762 ' + escape(task.page.name || task.page.id) + '</span>'
            + '<span>rev ' + task.baseRevision + '\u2192' + task.currentRevision + '</span></div>'
            + '<div class="instruction">' + escape(task.instruction) + '</div>'
            + '<div class="cells">\u8303\u56F4\uFF1A' + escape(task.scopeLabel || "\u53EA\u4FEE\u6539\u9009\u533A") + ' \xB7 \u56FE\u5143\uFF1A' + (cells || "\uFF08\u65E0\uFF09") + (region ? " \xB7 " + region : "") + '</div>'
            + (task.staleReason ? '<div style="margin-top:4px;font-size:11px;color:#b45309">\u26A0 ' + escape(task.staleReason) + '</div>' : "")
            + result + ignored + actions + '</div>';
        }).join("");
      }

      annBtn.addEventListener("click", openDrawer);
      document.getElementById("ann-close").addEventListener("click", closeDrawer);
      document.getElementById("ann-new").addEventListener("click", startAnnotation);
      document.getElementById("ann-cancel").addEventListener("click", cancelAnnotationForm);
      annFilter.addEventListener("change", () => void refreshAnnotations());
      annSubmit.addEventListener("click", submitAnnotation);
      annList.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const id = target.getAttribute("data-id");
        const nextStatus = target.getAttribute("data-status");
        if (id && nextStatus) void updateAnnotationStatus(id, nextStatus, target);
      });
      document.getElementById("patch-preview-cancel").addEventListener("click", () => {
        void cancelVisiblePatchPreview().catch(error => showStatus(error.message || "\u53D6\u6D88\u5019\u9009\u5931\u8D25", 5000));
      });
      patchPreviewBefore.addEventListener("click", () => setPatchPreviewView("before"));
      patchPreviewAfter.addEventListener("click", () => setPatchPreviewView("after"));
      patchPreviewCompare.addEventListener("click", () => setPatchPreviewView("compare"));
      patchPreviewDetailsToggle.addEventListener("click", () => {
        if (!patchPreviewDetailsToggle.disabled) {
          setPatchPreviewDetailsExpanded(!patchPreviewDetailsExpanded);
        }
      });
      document.getElementById("patch-preview-details-close").addEventListener("click", () => {
        setPatchPreviewDetailsExpanded(false);
      });
      document.addEventListener("keydown", event => {
        if (event.key === "Escape" && patchPreviewDetailsExpanded
          && (editorMode === "preview-loading" || editorMode === "previewing")) {
          setPatchPreviewDetailsExpanded(false);
        }
      });

      historyBtn.addEventListener("click", () => void openHistory());
      document.getElementById("hist-close").addEventListener("click", closeHistory);
      document.getElementById("hist-refresh").addEventListener("click", () => void refreshHistoryList());
      document.getElementById("hist-cancel").addEventListener("click", closeHistory);
      histRestore.addEventListener("click", showConfirmRestore);
      document.getElementById("hist-confirm-cancel").addEventListener("click", cancelConfirmRestore);
      document.getElementById("hist-confirm-ok").addEventListener("click", () => void confirmRestore());
      histPage.addEventListener("change", () => {
        if (selectedSnapshot) void loadPagePreview(selectedSnapshot.id, histPage.value);
      });
      histList.addEventListener("click", (event) => {
        const node = event.target instanceof Element ? event.target : null;
        const card = node ? node.closest(".h-card") : null;
        if (!card || !(card instanceof HTMLElement)) return;
        const id = card.getAttribute("data-id");
        if (selectedSnapshot && selectedSnapshot.id === id) { selectHistoryCard(selectedSnapshot); return; }
        void fetch(CONFIG.historyUrl, { cache: "no-store" }).then((response) => response.json()).then((result) => {
          const found = (result.entries || []).find((candidate) => candidate.id === id);
          if (found) selectHistoryCard(found);
        }).catch(() => showStatus("\u8BFB\u53D6\u5386\u53F2\u5931\u8D25", 4000));
      });
      document.getElementById("conflict-reload").addEventListener("click", () => void reloadLatest());
      document.getElementById("conflict-overwrite").addEventListener("click", () => void resolveConflict("user"));
      document.getElementById("conflict-modal-reload").addEventListener("click", () => void resolveConflict("agent"));
      document.getElementById("conflict-modal-overwrite").addEventListener("click", () => void resolveConflict("user"));
      document.getElementById("conflict-retry").addEventListener("click", retryRestoreLoad);
      histModal.addEventListener("click", (event) => {
        if (event.target === histModal) closeHistory();
      });
      histConfirm.addEventListener("click", (event) => {
        if (event.target === histConfirm) cancelConfirmRestore();
      });
      // Focus management: open moves focus into the top dialog, Escape closes
      // only the top dialog, and Tab/Shift+Tab stays inside the top dialog.
      function trapFocus(container, event) {
        const focusables = container.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusables.length === 0) { event.preventDefault(); return; }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          if (histConfirm.classList.contains("open")) cancelConfirmRestore();
          else if (histModal.classList.contains("open")) closeHistory();
          return;
        }
        if (event.key === "Tab") {
          if (histConfirm.classList.contains("open")) { trapFocus(histConfirm, event); return; }
          if (histModal.classList.contains("open")) { trapFocus(histModal, event); return; }
        }
      });

      editor.src = CONFIG.drawioUrl;
      window.addEventListener("message", async event => {
        if (event.origin !== CONFIG.drawioOrigin) return;
        let message = event.data;
        try { if (typeof message === "string") message = JSON.parse(message); } catch { return; }
        if (!message || typeof message !== "object") return;
        if (exportWorker && event.source === exportWorker.contentWindow) {
          if (message.event === "configure") {
            sendExportWorker({ action: "configure", config: { autosaveDelay: 0, preserveViewState: true } });
          } else if (message.event === "init" && pendingExport?.useWorker) {
            exportWorkerReady = true;
            sendExportWorker({
              action: "load",
              xml: pendingExport.xml,
              autosave: 0,
              diffSync: false,
              title: CONFIG.file,
            });
          } else if (message.event === "load" && pendingExport?.useWorker) {
            exportWorkerLoaded = true;
            dispatchExport();
          } else if (message.event === "export" && message.format !== "json" && pendingExport?.useWorker) {
            void saveExport(message);
          }
          return;
        }
        if (event.source !== editor.contentWindow) return;
        if (message.event === "configure") {
          sendEditor({ action: "configure", config: { autosaveDelay: 250, preserveViewState: true } });
        } else if (message.event === "init") {
          try {
            editorReady = true;
            current = await readLatest();
            canvasRevision = current.revision;
            lastEditorXml = current.xml;
            sendEditor({ action: "load", xml: current.xml, autosave: 1, diffSync: true, title: CONFIG.file });
            void refreshAnnotations();
            void refreshPatchPreview();
            if (pendingExport) setTimeout(dispatchExport, 250);
          } catch (error) { showStatus(error.message || "\u8BFB\u53D6\u5931\u8D25", 5000); }
        } else if (message.event === "export" && message.format === "json" && awaitingSelection) {
          applySelectionExport(message.data);
        } else if (message.event === "export" && message.format !== "json" && pendingExport) {
          void saveExport(message);
        } else if (message.event === "load" && typeof message.xml === "string") {
          lastEditorXml = message.xml;
          // Draw.io acknowledges action:"load" with event:"load". Only the
          // exact restore target may release the save guard; a delayed initial
          // load acknowledgement must not confirm a different document.
          confirmPatchPreviewLoad(message.xml);
          confirmRestoreTargetLoaded(message.xml);
        } else if ((message.event === "autosave" || message.event === "save") && typeof message.xml === "string") {
          lastEditorXml = message.xml;
          const action = decideHistoryAutosave(editorMode, message.xml, restoreTargetXml);
          if (action === "drop") return;
          if (action === "confirm") {
            // Keep accepting a matching autosave/save as a compatibility
            // fallback for editor builds that emit it after loading.
            confirmRestoreTargetLoaded(message.xml);
            return;
          }
          queueSave(message.xml);
        }
      });

      const events = new EventSource(CONFIG.eventsUrl);
      events.addEventListener("diagram", event => {
        const update = JSON.parse(event.data);
        if (update.clientId === clientId) return;
        clearTimeout(externalTimer);
        externalTimer = setTimeout(() => {
          if (editorMode === "restoring" || editorMode === "loading-restored-xml" || editorMode === "conflict") return;
          void applyExternalRevision(update.revision);
        }, 250);
      });
      events.addEventListener("annotation", () => {
        void refreshAnnotations();
      });
      events.addEventListener("preview", () => {
        void refreshPatchPreview().catch(error => showStatus(error.message || "\u5237\u65B0\u4FEE\u6539\u9884\u89C8\u5931\u8D25", 5000));
      });
      events.addEventListener("history", event => {
        if (!historyOpen) return;
        const update = JSON.parse(event.data);
        if (update.kind === "snapshot-created" || update.kind === "snapshot-evicted") {
          void refreshHistoryList();
        } else if (update.kind === "preview-ready" || update.kind === "preview-failed") {
          if (selectedSnapshot && update.snapshotId === selectedSnapshot.id) {
            void refreshHistoryList();
            if (update.kind === "preview-ready" && histPage.value) {
              void loadPagePreview(update.snapshotId, histPage.value);
            }
          } else {
            void refreshHistoryList();
          }
        }
      });
      events.onerror = () => showStatus("\u6B63\u5728\u91CD\u8FDE\u56FE\u8868\u540C\u6B65\u670D\u52A1\u2026", 5000);
      events.addEventListener("editor-command", event => {
        const command = JSON.parse(event.data);
        if (command.action === "export" && command.requestId && command.format) {
          requestEditorExport(command);
        }
      });
    })();
  </script>
</body>
</html>`}async function e3(J,Q){let W=new URL(J.url||"/",`http://${J.headers.host||"localhost"}`),Y=_();if(J.method==="GET"&&W.pathname==="/health"){w(Q,200,{ok:!0,service:"drawio-integrated-bridge"});return}let U=C3(J);if(!U){w(Q,401,{ok:!1,error:"invalid or expired session token"});return}let{session:G}=U;if(J.method==="GET"&&W.pathname==="/editor"){let H=_0(G.editorUrl||process.env.DRAWIO_WEB_URL?.trim()||"https://embed.diagrams.net"),V=new URL(`http://${Y.host}:${Y.port}`);Q.writeHead(200,{"Cache-Control":"no-store","Content-Security-Policy":`default-src 'self'; frame-src ${H.origin}; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`,"Content-Type":"text/html; charset=utf-8"}),Q.end(t3({session:G,editorUrl:H,bridgeUrl:V,["token"]:U.sessionKey}));return}if(J.method==="GET"&&W.pathname==="/api/diagram"){await p(G),w(Q,200,KJ(G));return}if(J.method==="PUT"&&W.pathname==="/api/diagram"){let H;try{H=await H6(J)}catch(B){w(Q,400,{ok:!1,error:B.message});return}let V=typeof H.xml==="string"?H.xml:"",q=H.baseRevision;if(!Number.isInteger(q)){w(Q,400,{ok:!1,error:"baseRevision must be an integer"});return}if(V.includes(AJ)){w(Q,409,{ok:!1,error:"preview_artifact",message:"\u4E34\u65F6\u4FEE\u6539\u9884\u89C8\u4E0D\u80FD\u4FDD\u5B58\u5230\u6B63\u5F0F Draw.io \u6587\u4EF6"});return}let L=TJ(G);if(H.source==="editor"&&L&&(s(V)===L.candidateHash||s(V)===s(L.comparePreviewXml))){w(Q,409,{ok:!1,error:"preview_candidate",message:"\u53EA\u8BFB\u4FEE\u6539\u9884\u89C8\u5019\u9009\u4E0D\u80FD\u901A\u8FC7\u7F16\u8F91\u5668\u4FDD\u5B58\uFF0C\u5FC5\u987B\u5148\u5B8C\u6210\u5199\u524D\u5BA1\u6279"});return}let M=await L6(G,V,q,O3(H.source),typeof H.clientId==="string"?H.clientId:null,{autoMerge:H.source==="editor"});if(M.conflict){w(Q,409,{ok:!1,error:"revision_conflict",current:KJ(M.current),manualChanges:M.manualChanges,merge:M.merge});return}if(M.invalid){w(Q,422,{ok:!1,error:"invalid Draw.io XML",validation:M.report});return}w(Q,200,{ok:!0,...KJ(M.document),validation:M.validation,autoMerge:M.autoMerge});return}if(J.method==="GET"&&W.pathname==="/api/events"){Q.writeHead(200,{"Cache-Control":"no-cache",Connection:"keep-alive","Content-Type":"text/event-stream; charset=utf-8"}),Q.write(`: connected

`);let H=W.searchParams.get("file"),V=H?RJ({directory:G.workspace},H):G.file,q={response:Q,diagramKey:u(V)},L=Y.eventClients.get(G.sessionId)||new Set;L.add(q),Y.eventClients.set(G.sessionId,L),J.on("close",()=>{if(L.delete(q),L.size===0)Y.eventClients.delete(G.sessionId)});return}if(J.method==="GET"&&W.pathname==="/api/preview"){await p(G);let H=TJ(G);w(Q,200,{ok:!0,preview:H?iJ(H,!0):null});return}let Z=W.pathname.match(/^\/api\/preview\/([^/]+)$/),K=Z?decodeURIComponent(Z[1]):null;if(K&&J.method==="DELETE"){let H=Y.patchPreviews.get(K);if(!H||H.sessionId!==G.sessionId||H.diagramKey!==u(G.file)){w(Q,404,{ok:!1,error:"patch preview not found"});return}R6(G,H,"\u7528\u6237\u9000\u51FA\u4E86\u4FEE\u6539\u9884\u89C8"),w(Q,200,{ok:!0,preview:iJ(H)});return}if(J.method==="GET"&&W.pathname==="/api/history"){await n1(G),await p(G);try{await v3(G)}catch(L){console.warn(`history reconcile failed for ${G.file}: ${L.message}`)}let H=null;try{H=await uJ(G)}catch(L){G.historyWarning=`history disabled: ${L.message}`,console.warn(G.historyWarning),await i1(G),H=null}let V=H?[...H.entries].sort((L,M)=>M.sequence-L.sequence):[],q=H?[...H.entries].reverse().find((L)=>L.contentHash===G.fileHash)?.id??null:null;w(Q,200,{ok:!0,file:E.relative(G.workspace,G.file).split(E.sep).join("/"),currentRevision:G.revision,currentSnapshotId:q,historyWarning:G.historyWarning,count:V.length,entries:V.map((L)=>({id:L.id,sequence:L.sequence,createdAt:L.createdAt,source:L.source,isCurrent:L.id===q,restoredFromSnapshotId:L.restoredFromSnapshotId,restoredFromSequence:L.restoredFromSnapshotId?H?.entries.find((M)=>M.id===L.restoredFromSnapshotId)?.sequence??null:null,pages:L.pages,previewState:L.previewState}))});return}let $=W.pathname.match(/^\/api\/history\/([^/]+)\/preview$/);if(J.method==="GET"&&$){let H=decodeURIComponent($[1]);if(!j6.test(H)){w(Q,400,{ok:!1,error:"invalid snapshot id"});return}let V=W.searchParams.get("pageId")||"",q=W.searchParams.get("mode")||"thumb";if(q!=="thumb"&&q!=="preview"){w(Q,400,{ok:!1,error:"mode must be thumb or preview"});return}if(!V){w(Q,400,{ok:!1,error:"pageId is required"});return}try{let M=(await uJ(G))?.entries.find((O)=>O.id===H);if(!M){w(Q,404,{ok:!1,error:"snapshot not found"});return}if(!M.pages.some((O)=>O.id===V)){w(Q,404,{ok:!1,error:"page not found in snapshot"});return}try{await o0(G,H,M.contentHash)}catch(O){if(O.code==="ENOENT"){w(Q,404,{ok:!1,error:"snapshot not found"});return}w(Q,503,{ok:!1,error:"preview_unavailable",detail:O.message});return}let B=null,j=g1(G,H,V,q);try{B=await y.readFile(j)}catch(O){if(O.code!=="ENOENT")throw O}if(!B)try{B=await d1(G,H,V,q)}catch(O){if(/page not found in snapshot/.test(O.message)){w(Q,404,{ok:!1,error:"page not found in snapshot"});return}w(Q,503,{ok:!1,error:"preview_unavailable",detail:O.message});return}Q.writeHead(200,{"Content-Type":"image/png","Cache-Control":"private, max-age=86400","Content-Length":String(B.length)}),Q.end(B)}catch(L){w(Q,500,{ok:!1,error:L.message})}return}let z=W.pathname.match(/^\/api\/history\/([^/]+)\/restore$/);if(J.method==="POST"&&z){let H=decodeURIComponent(z[1]);if(!j6.test(H)){w(Q,400,{ok:!1,error:"invalid snapshot id"});return}let V;try{V=await H6(J)}catch(M){w(Q,400,{ok:!1,error:M.message});return}let q=V.baseRevision;if(!Number.isInteger(q)){w(Q,400,{ok:!1,error:"baseRevision must be an integer"});return}let L=await h3(G,H,q,typeof V.clientId==="string"?V.clientId:null);if(L.conflict){w(Q,409,{ok:!1,error:"revision_conflict",current:KJ(L.current)});return}if(L.invalid){if(L.error==="snapshot_not_found")w(Q,404,{ok:!1,error:"snapshot_not_found"});else if(L.error==="current_snapshot")w(Q,400,{ok:!1,error:"current_snapshot"});else w(Q,422,{ok:!1,error:"snapshot_damaged",detail:L.error});return}if(L.checkpointFailed){w(Q,500,{ok:!1,error:"current_checkpoint_failed",detail:L.error});return}if(L.partFailed){w(Q,200,{ok:!0,partial:!0,message:L.message,...KJ(L.document)});return}w(Q,200,{ok:!0,...KJ(L.document),snapshotId:L.snapshot.id,sequence:L.snapshot.sequence,restoredFromSnapshotId:L.snapshot.restoredFromSnapshotId,restoredFromSequence:L.restoredFromSequence,annotationInvalidationWarning:L.annotationInvalidationWarning});return}let F=W.pathname.match(/^\/api\/annotations\/([^/]+)$/),X=F?decodeURIComponent(F[1]):null;if(J.method==="GET"&&W.pathname==="/api/annotations"){await p(G);let H=VJ(G),V=W.searchParams.get("status")||"pending";if(!["pending","open","fresh","stale","resolved","ignored","all"].includes(V)){w(Q,400,{ok:!1,error:`unsupported annotation status: ${V}`});return}let L=V,M=[...H.values()].map((j)=>({task:j,state:w5(G,j)})).sort((j,O)=>O.task.updatedAt.localeCompare(j.task.updatedAt)),B=M.filter((j)=>e1(j.state,L)).map((j)=>aJ(G,j.task,j.state));w(Q,200,{ok:!0,file:E.relative(G.workspace,G.file).split(E.sep).join("/"),status:L,count:B.length,counts:JQ(M.map((j)=>j.state)),annotations:B});return}if(J.method==="POST"&&W.pathname==="/api/annotations"){let H;try{H=await H6(J)}catch(S){w(Q,400,{ok:!1,error:S.message});return}let V=typeof H.instruction==="string"?H.instruction.trim():"";if(!V){w(Q,400,{ok:!1,error:"instruction must not be empty"});return}let q=typeof H.pageId==="string"?H.pageId:"",L=typeof H.pageName==="string"?H.pageName:"",M=c0(H.scope),B=Array.isArray(H.cells)?H.cells.filter((S)=>l(S)&&typeof S.id==="string").map((S)=>({id:String(S.id),kind:S.kind==="edge"?"edge":"node",label:typeof S.label==="string"?S.label:"",source:typeof S.source==="string"?S.source:void 0,target:typeof S.target==="string"?S.target:void 0})):[];if(B.length===0){w(Q,400,{ok:!1,error:"select at least one cell before adding an annotation"});return}await p(G);let j=f(G.xml),O=s3(j,q,L,B);if(!O){w(Q,400,{ok:!1,error:q?`page "${q}" not found`:"the diagram has no pages to annotate",pages:j.map((S)=>({id:S.id,name:S.name}))});return}let P=new Map(O.cells.map((S)=>[S.id,S]));for(let S of B){let x=P.get(S.id);if(!x){w(Q,400,{ok:!1,error:`cell "${S.id}" not found on page "${O.name||O.id}"`});return}if(S.kind==="node"&&!x.vertex){w(Q,400,{ok:!1,error:`cell "${S.id}" is not a node on page "${O.name||O.id}"`});return}if(S.kind==="edge"&&!x.edge){w(Q,400,{ok:!1,error:`cell "${S.id}" is not an edge on page "${O.name||O.id}"`});return}if(S.kind==="edge"&&x.edge){if(S.source!==void 0&&S.source!==(x.source??"")){w(Q,400,{ok:!1,error:`edge "${S.id}" source mismatch: "${S.source}" does not match "${x.source??""}"`});return}if(S.target!==void 0&&S.target!==(x.target??"")){w(Q,400,{ok:!1,error:`edge "${S.id}" target mismatch: "${S.target}" does not match "${x.target??""}"`});return}}}let R=O.id,T=O.name||L,A=i3(j,R,B.map((S)=>S.id)),D=new Date().toISOString(),C={id:`ant_${vJ(6).toString("base64url")}`,file:E.relative(G.workspace,G.file).split(E.sep).join("/"),pageId:R,pageName:T,cells:B,region:A,instruction:V,scope:M,status:"open",baseRevision:G.revision,baseFileHash:G.fileHash,baseCellHashes:o3(j,R,B.map((S)=>S.id)),result:null,createdAt:D,updatedAt:D,resolvedAt:null,ignoredAt:null,ignoredReason:null};VJ(G).set(C.id,C),await P6(G),O6(G,C,"created"),w(Q,201,{ok:!0,annotation:aJ(G,C)});return}if(X&&J.method==="GET"){await p(G);let V=VJ(G).get(X);if(!V){w(Q,404,{ok:!1,error:"annotation not found"});return}w(Q,200,{ok:!0,annotation:aJ(G,V)});return}if(X&&(J.method==="PATCH"||J.method==="PUT")){await p(G);let H=VJ(G),V=H.get(X);if(!V){w(Q,404,{ok:!1,error:"annotation not found"});return}let q;try{q=await H6(J)}catch(M){w(Q,400,{ok:!1,error:M.message});return}let L=typeof q.status==="string"?q.status:"";if((L==="resolved"||L==="ignored")&&V.status!=="open"){w(Q,409,{ok:!1,error:`annotation is ${V.status}; reopen it before changing to ${L}`});return}if(L==="resolved"){let M=typeof q.summary==="string"?q.summary.trim():"",B=Array.isArray(q.changedIds)?q.changedIds.map((j)=>String(j)):[];V.status="resolved",V.result={summary:M||"resolved",changedIds:B,revision:G.revision,updatedAt:new Date().toISOString()},V.resolvedAt=V.result.updatedAt,V.ignoredAt=null,V.ignoredReason=null,J8(G,V.id)}else if(L==="ignored"){let M=typeof q.reason==="string"?q.reason.trim():"";V.status="ignored",V.result=null,V.resolvedAt=null,V.ignoredAt=new Date().toISOString(),V.ignoredReason=M||"\u5DF2\u7531\u7528\u6237\u624B\u52A8\u5FFD\u7565",J8(G,V.id)}else if(L==="open")J8(G,V.id),V.status="open",V.result=null,V.resolvedAt=null,V.ignoredAt=null,V.ignoredReason=null;else{w(Q,400,{ok:!1,error:`unsupported annotation status: ${L||"(empty)"}`});return}V.updatedAt=new Date().toISOString(),H.set(X,V),await P6(G),O6(G,V,"updated"),w(Q,200,{ok:!0,annotation:aJ(G,V)});return}if(J.method==="POST"&&W.pathname==="/api/editor-export"){let H;try{H=await H6(J)}catch(j){w(Q,400,{ok:!1,error:j.message});return}let V=typeof H.requestId==="string"?H.requestId:"",q=V?Y.pendingEditorExports.get(V):void 0;if(!q||q.sessionId!==G.sessionId||q.diagramKey!==u(G.file)){w(Q,404,{ok:!1,error:"unknown editor export request"});return}let L=(j)=>{clearTimeout(q.timer),Y.pendingEditorExports.delete(V),q.reject(Error(j))};if(typeof H.error==="string"&&H.error){L(`editor export failed: ${H.error}`),w(Q,200,{ok:!1,error:H.error});return}if(typeof H.data!=="string"||!H.data){L("editor export returned no data"),w(Q,400,{ok:!1,error:"editor export data must be a non-empty data URI"});return}let M;try{M=F3(H.data)}catch(j){L(j.message),w(Q,400,{ok:!1,error:j.message});return}try{if(M.length===0||M.length>q5)throw Error("editor export size is out of range");if(X3(M,q.format),q.writeOutput)await m0(q.outputTarget,M,q.overwrite)}catch(j){L(j.message),w(Q,400,{ok:!1,error:j.message});return}clearTimeout(q.timer),Y.pendingEditorExports.delete(V);let B={outputTarget:q.outputTarget,bytes:M.length,contentType:$3(q.format),content:q.writeOutput?void 0:M};q.resolve(B),w(Q,200,{ok:!0,format:q.format,outputPath:E.relative(G.workspace,q.outputTarget).split(E.sep).join("/"),bytes:B.bytes});return}w(Q,404,{ok:!1,error:"not found"})}function JU(){let J=process.env.DRAWIO_BRIDGE_HOST?.trim()||"127.0.0.1",Q=process.env.DRAWIO_BRIDGE_PORT?.trim()||"0",W=Number(Q);if(!Number.isInteger(W)||W<0||W>65535)throw Error(`invalid DRAWIO_BRIDGE_PORT: ${Q}`);if(!["127.0.0.1","localhost","::1"].includes(J))throw Error("integrated Draw.io bridge must listen on loopback");return{host:J,port:W}}async function QU(){let J=_();if(J.startPromise)return J.startPromise;let Q=JU();return J.startPromise=new Promise((W,Y)=>{let U=SG((G,Z)=>{e3(G,Z).catch((K)=>{if(!Z.headersSent)w(Z,500,{ok:!1,error:K.message});else Z.end()})});U.once("error",(G)=>{J.startPromise=null,Y(G)}),U.listen(Q.port,Q.host,()=>{let G=U.address();if(!G||typeof G==="string"){J.startPromise=null,Y(Error("integrated Draw.io bridge did not bind a TCP port"));return}J.server=U,J.host=Q.host,J.port=G.port,W({host:Q.host,port:G.port})})}),J.startPromise}async function x0(J,Q){let W=f5(J),Y=await jJ(Q),U=a(f(Y));if(!U.valid)throw Error(`refusing to open invalid diagram: ${JSON.stringify(U.errors)}`);let G=_(),Z=G.sessions.get(J.sessionID),K;if(Z&&E.resolve(Z.file)===E.resolve(Q))K=await p(Z);else{K={sessionId:J.sessionID,bindingId:vJ(16).toString("base64url"),workspace:W,file:Q,revision:0,xml:Y,fileHash:s(Y),updatedBy:"initial",updatedAt:new Date().toISOString(),history:[{revision:0,xml:Y,updatedBy:"initial",updatedAt:new Date().toISOString()}],backupFile:null,activeAnnotationId:null,activePreviewId:null,annotationAuthorizations:new Map,historyWarning:null,revisionWarning:null};let F=await H8(K,K.fileHash);K.revision=F.ledger.revision,K.updatedBy=F.ledger.updatedBy,K.updatedAt=F.ledger.updatedAt,K.history=[{revision:K.revision,xml:K.xml,updatedBy:K.updatedBy,updatedAt:K.updatedAt}]}G.sessions.set(J.sessionID,K),K.bindingId??=vJ(16).toString("base64url"),K.activeAnnotationId??=null,K.activePreviewId??=null,K.annotationAuthorizations??=new Map,K.revisionWarning??=null,await g3(K),await x3(K);let $=await QU(),z=vJ(24).toString("base64url");return G.tokens.set(z,{sessionId:J.sessionID,diagramKey:u(K.file),bindingId:K.bindingId,expiresAt:Date.now()+B6}),{session:K,token:z,bridge:$}}var WU=`## Draw.io \u6587\u4EF6\u5199\u5165\u4E0E\u4EA4\u4ED8

\u5DF2\u901A\u8FC7 drawio_open \u7ED1\u5B9A\u7684\u6587\u4EF6\u53EF\u80FD\u5305\u542B\u7528\u6237\u5728\u5185\u7F6E\u6D4F\u89C8\u5668\u4E2D\u7684\u624B\u52A8\u4FEE\u6539\u3002
\u6BCF\u6B21\u65B0\u7684\u7528\u6237\u8F6E\u6B21\u53EA\u8981\u6D89\u53CA\u5DF2\u7ED1\u5B9A\u56FE\u8868\uFF0C\u5373\u4F7F\u672C\u8F6E\u6CA1\u6709\u52A0\u8F7D\u4EFB\u4F55 Draw.io Skill\uFF0C\u4E5F\u5FC5\u987B\u5148\u8C03\u7528 drawio_get_state \u540C\u6B65\u6700\u65B0 revision\u3001XML\u3001updatedBy \u548C updatedAt\uFF0C\u518D\u8C03\u7528 drawio_list_annotations(file=\u5F53\u524D\u6587\u4EF6, status="all") \u68C0\u67E5\u65B0\u589E\u6CE8\u91CA\u4EE5\u53CA instruction\u3001scope\u3001freshness\u3001resolved \u6216 ignored \u72B6\u6001\u53D8\u5316\uFF1B\u672C\u8F6E\u7ED3\u679C\u8986\u76D6\u4E0A\u4E00\u8F6E\u7F13\u5B58\u3002\u6B63\u5F0F\u5199\u5165\u524D\u518D\u6B21\u68C0\u67E5 revision\uFF0C\u6700\u7EC8\u4EA4\u4ED8\u524D\u518D\u6B21\u8C03\u7528 drawio_list_annotations(file=\u5F53\u524D\u6587\u4EF6, status="pending")\uFF1B\u82E5\u72B6\u6001\u53D8\u5316\uFF0C\u5FC5\u987B\u6309\u6700\u65B0\u57FA\u7EBF\u91CD\u65B0\u89C4\u5212\uFF0C\u7981\u6B62\u590D\u7528\u65E7 preview_id\u3001approval_token\u3001\u7A33\u5B9A ID \u6E05\u5355\u6216\u4E0A\u4E00\u8F6E\u7ED3\u8BBA\u3002
\u6BCF\u6B21\u4FEE\u6539\u524D\u5FC5\u987B\u7ACB\u5373\u8C03\u7528 drawio_get_state\uFF0C\u5E76\u628A\u8FD4\u56DE\u7684\u6700\u65B0 XML \u4F5C\u4E3A\u4FEE\u6539\u57FA\u7EBF\u3002\u4EBA\u5DE5\u7F16\u8F91\u4E0D\u662F\u53EA\u8BFB\u5185\u5BB9\uFF0C\u53EF\u4EE5\u6309\u5F53\u524D\u4EFB\u52A1\u8981\u6C42\u7EE7\u7EED\u8C03\u6574\u3002
\u63D0\u4EA4\u65F6\u5FC5\u987B\u643A\u5E26\u8BE5\u6B21\u8BFB\u53D6\u8FD4\u56DE\u7684\u51C6\u786E base_revision\uFF1Brevision_conflict \u540E\u91CD\u65B0\u8BFB\u53D6\uFF0C\u5728\u65B0 XML \u4E0A\u91CD\u65B0\u6267\u884C\u6240\u9700\u53D8\u66F4\u5E76\u91CD\u8BD5\uFF0C\u7981\u6B62\u91CD\u53D1\u65E7 XML\u3002
\u7981\u6B62\u7528\u666E\u901A write\u3001edit \u6216\u811A\u672C\u76F4\u63A5\u8986\u76D6\u5DF2\u7ED1\u5B9A\u7684 .drawio \u6587\u4EF6\uFF0C\u56E0\u4E3A\u8FD9\u4F1A\u7ED5\u8FC7 revision \u68C0\u67E5\u5E76\u53EF\u80FD\u7528\u65E7\u5FEB\u7167\u4E22\u5931\u6700\u65B0\u5185\u5BB9\u3002
\u5BF9\u5DF2\u7ED1\u5B9A\u6587\u4EF6\u7684\u666E\u901A\u4FEE\u6539\u5FC5\u987B\u5148\u7528 drawio_patch(dry_run=true)\u3001drawio_polish(dry_run=true) \u6216 drawio_preview_state \u751F\u6210\u540C\u753B\u5E03\u5019\u9009\uFF0C\u518D\u8C03\u7528 drawio_authorize_preview\u3002\u6388\u6743\u5DE5\u5177\u7B2C\u4E00\u6B21\u53EA\u8FD4\u56DE\u7ED1\u5B9A preview_id\u3001revision \u4E0E\u5019\u9009\u54C8\u5E0C\u7684 OpenCode question \u53C2\u6570\uFF1B\u5FC5\u987B\u628A arguments \u539F\u6837\u4F20\u7ED9\u5185\u7F6E question\uFF0C\u4E0D\u5F97\u81EA\u884C\u56DE\u7B54\u6216\u6539\u5199\u3002Question \u8FD4\u56DE\u540E\uFF0C\u518D\u6B21\u8C03\u7528\u540C\u4E00\u6388\u6743\u5DE5\u5177\uFF0C\u5E76\u663E\u5F0F\u4F20\u5165 approval_review_id=\u7B2C\u4E00\u6B21\u8FD4\u56DE\u7684 reviewId \u548C approval_answer=Question \u8FD4\u56DE\u7684\u539F\u59CB\u7B54\u6848\uFF1B\u53EA\u6709\u201C\u786E\u8BA4\u4FEE\u6539\u201D\u624D\u4F1A\u590D\u6838\u5E76\u5199\u5165\u3002\u201C\u53D6\u6D88\u4FEE\u6539\u201D\u3001\u5173\u95ED\u6216\u81EA\u5B9A\u4E49\u6587\u5B57\u90FD\u4E0D\u5199\u5165\uFF0C\u81EA\u5B9A\u4E49\u6587\u5B57\u662F\u4FEE\u6539\u53CD\u9988\uFF0C\u5FC5\u987B\u57FA\u4E8E\u6700\u65B0 revision \u91CD\u65B0\u751F\u6210\u9884\u89C8\u3002\u5B57\u4F53\u3001\u586B\u5145\u8272\u3001\u6587\u5B57\u8272\u3001\u8FB9\u6846\u8272\u7B49\u5E38\u7528\u5C5E\u6027\u4F7F\u7528 drawio_patch.style_updates\uFF1B\u53EA\u6709\u5B8C\u6574 XML \u624D\u80FD\u8868\u8FBE\u7684\u9875\u9762\u80CC\u666F\u6216\u9AD8\u7EA7\u6837\u5F0F\u4F7F\u7528 drawio_preview_state\u3002\u9884\u89C8\u628A\u4FEE\u6539\u524D\u3001\u771F\u5B9E\u4FEE\u6539\u540E\u548C\u5E26\u9AD8\u4EAE\u8986\u76D6\u5C42\u7684\u524D\u540E\u5BF9\u6BD4\u5206\u5F00\uFF0C\u5E76\u63D0\u4F9B\u53EF\u6536\u8D77\u7684\u5C5E\u6027\u7EA7\u53D8\u5316\u8BE6\u60C5\uFF1B\u7EFF\u8272\u8868\u793A\u65B0\u589E\u3001\u9EC4\u8272\u8868\u793A\u4FEE\u6539\u3001\u7EA2\u8272\u8868\u793A\u5220\u9664\u6216\u539F\u4F4D\u7F6E\u3001\u84DD\u8272\u8868\u793A\u53D8\u66F4\u8FDE\u7EBF\u3002
\u672C\u8F6E\u5168\u90E8\u53EF\u6267\u884C\u521B\u5EFA\u6216\u4FEE\u6539\uFF08\u5305\u62EC fresh annotation\uFF09\u5B8C\u6210\u540E\u5FC5\u987B\u7EDF\u4E00\u8C03\u7528 drawio_finalize\uFF1A\u6821\u9A8C\u3001\u8BC4\u5206\u3001\u81EA\u52A8\u5BFC\u51FA\u540C\u540D PNG\u3002\u8C03\u7528\u524D\u5FC5\u987B\u5148\u8C03\u7528 drawio_list_annotations(status='pending') \u63A2\u6D4B\u672A\u5B8C\u6210\u6CE8\u91CA\uFF1B\u5B58\u5728 requiresConfirmation=false \u7684\u6CE8\u91CA\u65F6 drawio_finalize \u4F1A\u62D2\u7EDD\u6267\u884C\uFF0C\u5FC5\u987B\u5148\u9010\u6761\u5904\u7406\u5E76 drawio_resolve_annotation \u540E\u518D\u91CD\u8BD5\uFF0C\u4E0D\u5F97\u8DF3\u8FC7\u3002\u53EA\u6709\u8FD4\u56DE shouldOpenBrowser=true \u65F6\u624D\u8C03\u7528 MobileWork \u5DE5\u5177 openwork_browser_open_url\uFF0C\u5E76\u4F20\u5165 url=openUrl\u3001provider="builtin"\uFF1BeditorConnected=true \u65F6\u5FC5\u987B\u4FDD\u6301\u73B0\u6709\u7F16\u8F91\u5668\uFF0C\u7981\u6B62\u91CD\u65B0\u6253\u5F00\u6216\u5237\u65B0\uFF0C\u4EE5\u514D\u4E22\u5931\u7528\u6237\u5C1A\u672A\u4FDD\u5B58\u7684\u7F16\u8F91\u3002
drawio_export \u652F\u6301 PNG\u3001JPEG\u3001PDF\u3001xmlpng\u3001SVG\u3001xmlsvg \u548C html2\u3002SVG\u3001xmlsvg\u3001html2 \u7531\u5185\u7F6E\u6D4F\u89C8\u5668\u7F16\u8F91\u5668\u6E32\u67D3\u5E76\u901A\u8FC7 Bridge \u5199\u56DE\u5DE5\u4F5C\u533A\uFF1B\u8FD4\u56DE editor_required \u65F6\u5FC5\u987B\u7ACB\u5373\u8C03\u7528 openwork_browser_open_url\uFF0C\u5E76\u4F20\u5165 url=openUrl\u3001provider="builtin"\uFF0C\u7B49\u5F85\u7F16\u8F91\u5668\u8FDE\u63A5\u540E\u7528\u5B8C\u5168\u76F8\u540C\u7684\u53C2\u6570\u91CD\u8BD5\uFF0C\u7981\u6B62\u628A\u8BE5\u72B6\u6001\u89E3\u91CA\u4E3A\u4E0D\u652F\u6301\u683C\u5F0F\u6216\u8981\u6C42\u7528\u6237\u624B\u5DE5\u5BFC\u51FA\u3002PNG\u3001JPEG\u3001xmlpng\u3001SVG\u3001xmlsvg \u4F7F\u7528 all_pages=true \u65F6\u9010\u9875\u751F\u6210\u6587\u4EF6\u5E76\u8FD4\u56DE outputs[]\uFF0C\u5FC5\u987B\u6838\u5BF9 page_count \u4E0E outputs \u6570\u91CF\u4E00\u81F4\uFF1BPDF \u548C html2 \u7684 all_pages=true \u5404\u8FD4\u56DE\u4E00\u4E2A\u5305\u542B\u5168\u90E8\u9875\u9762\u7684\u591A\u9875\u5355\u6587\u4EF6\uFF0Chtml2 \u8FD8\u9700\u6838\u5BF9 contains_all_pages=true\u3002

## \u6CE8\u91CA\u4EFB\u52A1\uFF08\u6846\u9009\u8BC4\u5BA1\uFF09

\u7528\u6237\u5728\u5185\u7F6E\u6D4F\u89C8\u5668\u4E2D\u6846\u9009\u56FE\u5143\u5E76\u63D0\u4EA4\u6CE8\u91CA\u540E\uFF0C\u6BCF\u6761\u6CE8\u91CA\u662F\u4E00\u6761\u6309\u56FE\u8868\u6587\u4EF6\u6301\u4E45\u5316\u7684\u72EC\u7ACB\u4EFB\u52A1\uFF0C\u4E0D\u7ED1\u5B9A\u521B\u5EFA\u5B83\u7684\u5BF9\u8BDD session\uFF1B\u4EFB\u52A1\u8BB0\u5F55\u7A33\u5B9A ID\u3001\u9875\u9762\u3001\u533A\u57DF\u8303\u56F4\u3001\u4FEE\u6539\u8BF4\u660E\u3001\u5141\u8BB8\u8303\u56F4\u548C\u63D0\u4EA4\u65F6\u7684\u56FE\u8868\u57FA\u7EBF\u3002
\u6CE8\u91CA\u7684\u6301\u4E45\u5316 status \u4E3A open/resolved/ignored\uFF1Bfreshness=stale \u8868\u793A\u56FE\u5143\u5DF2\u53D8\u5316\u4F46\u4EFB\u52A1\u4ECD\u672A\u5B8C\u6210\u3002\u6267\u884C stale \u6CE8\u91CA\u524D\u5FC5\u987B\u5148\u8BE2\u95EE\u7528\u6237\uFF1Bfresh \u6CE8\u91CA\u53EF\u76F4\u63A5\u8FDB\u5165\u8BA1\u5212\u548C\u5BA1\u6279\u6D41\u7A0B\u3002resolved \u548C ignored \u90FD\u662F\u7EC8\u6001\uFF0CAgent \u5FC5\u987B\u8DF3\u8FC7\uFF0C\u53EA\u6709\u7528\u6237\u91CD\u65B0\u6253\u5F00\u540E\u624D\u80FD\u5904\u7406\u3002
\u5904\u7406\u6CE8\u91CA\u65F6\u5FC5\u987B\u5148\u8BFB\u53D6\u6700\u65B0\u72B6\u6001\u5E76 dry-run\uFF0C\u8BA9\u5019\u9009\u7ED3\u679C\u663E\u793A\u5728\u540C\u4E00 Draw.io \u753B\u5E03\u4E2D\uFF1B\u5411\u7528\u6237\u8BF4\u660E\u8BA1\u5212\u3001\u5B8C\u6574\u7A33\u5B9A ID \u6E05\u5355\u548C\u8303\u56F4\u540E\uFF0C\u643A\u5E26 preview_id \u8C03\u7528 drawio_authorize_annotation_change\u3002\u7B2C\u4E00\u6B21\u8C03\u7528\u53EA\u8FD4\u56DE OpenCode question \u53C2\u6570\uFF1B\u539F\u6837\u8C03\u7528\u5185\u7F6E question\u3002Question \u8FD4\u56DE\u540E\uFF0C\u628A\u7B2C\u4E00\u6B21\u8FD4\u56DE\u7684 reviewId \u548C\u539F\u59CB\u7B54\u6848\u5206\u522B\u4F5C\u4E3A approval_review_id\u3001approval_answer \u663E\u5F0F\u4F20\u5165\u7B2C\u4E8C\u6B21\u6388\u6743\u8C03\u7528\uFF1B\u53EA\u6709\u201C\u786E\u8BA4\u4FEE\u6539\u201D\u624D\u4F1A\u8FD4\u56DE\u5F53\u524D session \u7684\u4E00\u6B21\u6027 token\u3002\u63D2\u4EF6\u4E8B\u4EF6\u6865\u4EC5\u4F5C\u517C\u5BB9\u548C\u5BA1\u8BA1\u8F85\u52A9\uFF0C\u6B63\u5E38\u6388\u6743\u4E0D\u4F9D\u8D56\u5B83\u3002\u53D6\u6D88\u3001\u5173\u95ED\u3001\u81EA\u5B9A\u4E49\u6587\u5B57\u3001\u8FC7\u671F\u6216\u91CD\u653E\u56DE\u590D\u5747\u4E0D\u6388\u6743\u3002\u6B63\u5F0F drawio_patch/drawio_update_state \u7684 XML \u5FC5\u987B\u4E0E\u5DF2\u5C55\u793A\u5019\u9009\u5B8C\u5168\u4E00\u81F4\u3002\u975E\u5168\u56FE\u8303\u56F4\u7531\u8FD0\u884C\u65F6\u5F3A\u5236\u4F7F\u7528\u6CE8\u91CA\u7ED1\u5B9A\u7684 pageId\uFF1Bdiagram_wide \u8986\u76D6\u5F53\u524D\u56FE\u8868\u5168\u90E8\u9875\u9762\u5E76\u4F7F\u7528 pageId:cellId\u3002\u7981\u6B62\u5148\u6539\u540E\u95EE\u3002
\u4E0D\u5F97\u4FEE\u6539\u6388\u6743\u8303\u56F4\u5916\u5185\u5BB9\u3002\u786E\u9700\u8D8A\u754C\u65F6\uFF0C\u5728 authorization \u7684 escalation_reason \u4E2D\u5148\u8BF4\u660E\u4E0D\u53EF\u907F\u514D\u7684\u539F\u56E0\u5E76\u7533\u8BF7\u66F4\u5BBD\u8303\u56F4\uFF1B\u672A\u83B7\u6279\u51C6\u4E0D\u5F97\u5199\u5165\u3002drawio_polish \u4F1A\u91CD\u6392\u6574\u9875\uFF0C\u5B58\u5728\u6D3B\u52A8\u6CE8\u91CA\u65F6\u53EA\u6709\u53D6\u5F97 diagram_wide \u5BA1\u6279\u540E\u624D\u80FD\u6B63\u5F0F\u8FD0\u884C\u3002
\u7528\u6237\u672C\u8F6E\u53E6\u6709\u660E\u786E\u4EFB\u52A1\u65F6\u5148\u5B8C\u6210\u8BE5\u4EFB\u52A1\uFF0C\u7136\u540E\u5728\u540C\u4E00\u8F6E\u91CD\u65B0\u63A2\u6D4B\u6CE8\u91CA\uFF1B\u6700\u7EC8\u56DE\u590D\u524D\u4ECD\u5B58\u5728 requiresConfirmation=false \u7684 open \u6CE8\u91CA\u65F6\u5FC5\u987B\u7EE7\u7EED\u5904\u7406\uFF0C\u4E0D\u80FD\u53EA\u63D0\u793A\u7528\u6237\u7A0D\u540E\u7EE7\u7EED\u3002
\u6CE8\u91CA\u4EFB\u52A1\u7684\u68C0\u67E5\u4E0E\u5904\u7406\u6D41\u7A0B\u7531 drawio-session-editing \u6280\u80FD\u8D1F\u8D23\u7F16\u6392\uFF0C\u8BE6\u89C1\u8BE5 SKILL.md\u3002`,YU="Agent ID \u662F `drawio-expert`";function GU(J){if(!J||typeof J!=="object"||Array.isArray(J))return null;let Q=J;for(let W of["filePath","file_path","path","file"])if(typeof Q[W]==="string"&&Q[W].toLowerCase().endsWith(".drawio"))return Q[W];return null}async function $Z(J){await j1(J)}function UU(J,Q){if(!l(J))return!1;if(J.question!==Q.question||J.header!==Q.header||J.multiple!==!1||J.custom!==!0||!Array.isArray(J.options)||J.options.length!==Q.options.length)return!1;return J.options.every((W,Y)=>{let U=Q.options[Y];return l(W)&&W.label===U.label&&W.description===U.description})}function HZ(J){if(!l(J)||typeof J.type!=="string"||!l(J.properties))return!1;let Q=J.properties,W=_();if(r0(),J.type==="question.asked"||J.type==="question.v2.asked"){if(typeof Q.id!=="string"||typeof Q.sessionID!=="string"||!Array.isArray(Q.questions)||Q.questions.length!==1||!l(Q.tool)||typeof Q.tool.callID!=="string"||typeof Q.tool.messageID!=="string")return!1;let Z=[...W.approvalReviews.values()].find((K)=>K.sessionId===Q.sessionID&&(K.status==="awaiting_question"||K.status==="waiting_for_user")&&UU(Q.questions[0],K.question));if(!Z)return!1;if(!Z.requestIds.includes(Q.id))Z.requestIds.push(Q.id);return Z.status="waiting_for_user",W.questionReviewIds.set(Q.id,Z.id),!0}if(J.type!=="question.replied"&&J.type!=="question.v2.replied"&&J.type!=="question.rejected"&&J.type!=="question.v2.rejected")return!1;if(typeof Q.requestID!=="string"||typeof Q.sessionID!=="string")return!1;let Y=W.questionReviewIds.get(Q.requestID),U=Y?W.approvalReviews.get(Y):null;if(!U||U.sessionId!==Q.sessionID||U.status!=="waiting_for_user")return!1;if(U.resolvedAt=new Date().toISOString(),Z8(U),J.type.endsWith(".rejected"))return U.status="cancelled",U.feedback=null,!0;let G=Array.isArray(Q.answers)&&Array.isArray(Q.answers[0])?Q.answers[0].filter((Z)=>typeof Z==="string").map((Z)=>Z.trim()).filter(Boolean):[];if(G.length===1&&G[0]===K8)U.status="approved",U.feedback=null;else if(G.length===0||G.length===1&&G[0]===a0)U.status="cancelled",U.feedback=null;else U.status="feedback",U.feedback=G.join(`
`);return!0}function VZ(J){if(!J.system.some((Q)=>Q.includes(YU)))return!1;return J.system.push(WU),!0}function qZ(J,Q){if(!["write","edit","apply_patch"].includes(J.tool))return;let W=GU(Q.args);if(!W)return;let U=_().sessions.get(J.sessionID);if(!U)return;if((E.isAbsolute(W)?E.resolve(W):E.resolve(U.workspace,W)).toLowerCase()===E.resolve(U.file).toLowerCase())throw Error("This Draw.io file is bound to an active browser session. Call drawio_get_state, then use drawio_patch, drawio_polish, or drawio_update_state with its exact revision.")}var LZ=["drawio_validate","drawio_export","drawio_health_check","drawio_create","drawio_inspect","drawio_quality","drawio_patch","drawio_polish","drawio_compare","drawio_get_state","drawio_preview_state","drawio_update_state","drawio_open","drawio_finalize","drawio_list_annotations","drawio_get_annotation","drawio_authorize_preview","drawio_authorize_annotation_change","drawio_resolve_annotation"],X1=new WeakMap;function zU(J){let Q=X1.get(J);if(Q)return Q;let W=J,Y=W.schema.object({id:W.schema.string().describe("Stable unique cell id; 0 and 1 are reserved"),label:W.schema.string().describe("Visible node label"),kind:W.schema.enum(["default","application","service","database","external","decision"]).optional().describe("Visual node category")}),U=W.schema.object({id:W.schema.string().optional().describe("Stable unique edge id"),source:W.schema.string().describe("Source node id"),target:W.schema.string().describe("Target node id"),label:W.schema.string().optional().describe("Visible edge label")}),G=W.schema.object({font_size:W.schema.number().positive().max(200).optional(),font_family:W.schema.string().min(1).max(120).optional(),font_color:W.schema.string().min(1).max(80).optional(),fill_color:W.schema.string().min(1).max(80).optional(),stroke_color:W.schema.string().min(1).max(80).optional(),stroke_width:W.schema.number().min(0).max(50).optional(),opacity:W.schema.number().min(0).max(100).optional(),rounded:W.schema.boolean().optional(),dashed:W.schema.boolean().optional()}),Z=W.schema.object({type:W.schema.enum(["add-node","update-node","remove-node","add-edge","update-edge","remove-edge"]),id:W.schema.string().describe("Stable target or new cell id"),label:W.schema.string().optional(),kind:W.schema.enum(["default","application","service","database","external","decision"]).optional(),source:W.schema.string().optional(),target:W.schema.string().optional(),x:W.schema.number().optional(),y:W.schema.number().optional(),width:W.schema.number().positive().optional(),height:W.schema.number().positive().optional(),style_updates:G.optional().describe("Whitelisted visual property updates that preserve unrelated style keys"),cascade:W.schema.boolean().optional().describe("For remove-node, also remove connected edges")}),K=(z)=>J({...z,async execute(F,X){return await j1(X.directory),z.execute(F,X)}}),$={drawio_validate:K({description:"Validate a workspace Draw.io file and report pages, file size, nodes, edges, errors, and warnings.",args:{input_path:W.schema.string().describe("Workspace-relative .drawio or .xml file")},async execute(z,F){let X=RJ(F,z.input_path),H=wJ(F,X),V=H?(await p(H)).xml:await jJ(X),q=f(V),L=await y.stat(X);return JSON.stringify({success:!0,input_path:m(F,X),file_size_bytes:L.size,is_valid_drawio:!0,page_count:q.length,pages:q.map((M)=>({id:M.id,name:M.name,compressed:M.compressed,nodes:M.cells.filter((B)=>B.vertex).length,edges:M.cells.filter((B)=>B.edge).length})),...a(q)},null,2)}}),drawio_export:K({description:"Export a workspace Draw.io file. PNG, JPEG, PDF, and editable PNG (xmlpng) use the Docker HTTP Export Server. SVG, editable SVG (xmlsvg), and HTML (html2) use the built-in browser Bridge. all_pages=true writes one file per page for PNG/JPEG/xmlpng/SVG/XMLSVG, while PDF and HTML2 each produce one multi-page file. page_id exports one page for every format. When an editor-channel export is not connected, call openwork_browser_open_url with url=openUrl and provider=builtin, then retry the same export.",args:{input_path:W.schema.string().describe("Workspace-relative .drawio or .xml input file"),format:W.schema.enum(["png","jpeg","pdf","xmlpng","svg","xmlsvg","html2"]),output_path:W.schema.string().optional().describe("Workspace-relative output path"),page_id:W.schema.string().optional().describe("Stable page id to export; cannot be combined with all_pages"),all_pages:W.schema.boolean().default(!1).describe("Export every page; multi-file formats return outputs[], while PDF and HTML2 return one multi-page file"),scale:W.schema.number().positive().default(1),border:W.schema.number().int().min(0).default(0),background:W.schema.string().default(w0).describe("Export background color; defaults to white to avoid transparent PNG previews"),embed_xml:W.schema.boolean().default(!1),overwrite:W.schema.boolean().default(!1)},async execute(z,F){let X=RJ(F,z.input_path),H=wJ(F,X),V=H?await p(H):null,q=V?.xml||await jJ(X),L=V?.revision,M=a(f(q));if(!M.valid)throw Error(`refusing to export invalid Draw.io XML: ${JSON.stringify(M.errors)}`);if(z.page_id&&z.all_pages)throw Error("page_id and all_pages cannot be used together");if(N1.has(z.format)){let j=z.page_id?y1(q,z.page_id):null;if(z.all_pages&&k1.has(z.format)){let R=await L3({context:F,inputTarget:X,xml:q,format:z.format,outputPath:z.output_path,sourceRevision:L,overwrite:z.overwrite});if(R.status==="editor_required")return JSON.stringify({status:"editor_required",message:"SVG and HTML exports are rendered by the Draw.io editor page in the built-in browser, which is currently not connected for this diagram.",input_path:m(F,X).split(E.sep).join("/"),format:z.format,all_pages:!0,openUrl:R.openUrl,browserAction:"Call MobileWork's openwork_browser_open_url tool with url=openUrl and provider=builtin now, wait for the editor page to finish loading, then call drawio_export again with identical arguments to complete the export.",tokenExpiresAt:R.tokenExpiresAt},null,2);return JSON.stringify({success:!0,channel:"editor",input_path:m(F,X).split(E.sep).join("/"),format:z.format,all_pages:!0,page_count:R.outputs.length,source_revision:R.sourceRevision,outputs:R.outputs.map((T)=>({page_index:T.pageIndex,page_id:T.pageId,page_name:T.pageName,output_path:m(F,T.outputTarget).split(E.sep).join("/"),file_size_bytes:T.bytes,content_type:T.contentType}))},null,2)}let O=z.page_id?z.format==="html2"?Z3(q,z.page_id):q:z.all_pages?q:void 0,P=await b1({context:F,inputTarget:X,format:z.format,outputPath:z.output_path,xml:O,pageId:z.page_id,allPages:z.all_pages,sourceRevision:L,overwrite:z.overwrite});if(P.status==="editor_required")return JSON.stringify({status:"editor_required",message:"SVG and HTML exports are rendered by the Draw.io editor page in the built-in browser, which is currently not connected for this diagram.",input_path:m(F,X).split(E.sep).join("/"),format:z.format,openUrl:P.openUrl,browserAction:"Call MobileWork's openwork_browser_open_url tool with url=openUrl and provider=builtin now, wait for the editor page to finish loading, then call drawio_export again with identical arguments to complete the export.",tokenExpiresAt:P.tokenExpiresAt},null,2);return JSON.stringify({success:!0,channel:"editor",input_path:m(F,X).split(E.sep).join("/"),output_path:m(F,P.outputTarget).split(E.sep).join("/"),format:z.format,file_size_bytes:P.bytes,content_type:P.contentType,page_id:j?.id,page_name:j?.name,all_pages:z.all_pages,page_count:z.all_pages&&z.format==="html2"?M.stats.pages:void 0,contains_all_pages:z.all_pages&&z.format==="html2"?!0:void 0,source_revision:P.sourceRevision},null,2)}if(z.all_pages&&D1.has(z.format)){let j=await V3({context:F,inputTarget:X,xml:q,format:z.format,outputPath:z.output_path,scale:z.scale,border:z.border,background:z.background,embedXml:z.format==="xmlpng"||z.embed_xml,overwrite:z.overwrite});return JSON.stringify({success:!0,channel:"docker",input_path:m(F,X).split(E.sep).join("/"),format:z.format,all_pages:!0,page_count:j.length,outputs:j.map((O)=>({page_index:O.pageIndex,page_id:O.pageId,page_name:O.pageName,output_path:m(F,O.outputTarget).split(E.sep).join("/"),file_size_bytes:O.bytes,content_type:O.contentType,export_url:O.exportUrl}))},null,2)}let B=await Q1({context:F,inputTarget:X,xml:q,format:z.format,outputPath:z.output_path,pageId:z.page_id,allPages:z.all_pages,scale:z.scale,border:z.border,background:z.background,embedXml:z.format==="xmlpng"||z.embed_xml,overwrite:z.overwrite});return JSON.stringify({success:!0,channel:"docker",input_path:m(F,X).split(E.sep).join("/"),output_path:m(F,B.outputTarget).split(E.sep).join("/"),format:z.format,file_size_bytes:B.bytes,content_type:B.contentType,export_url:B.exportUrl,all_pages:z.all_pages,page_count:z.all_pages?M.stats.pages:void 0},null,2)}}),drawio_health_check:K({description:"Check the TypeScript Draw.io runtime and Docker Export Server; deep=true performs a real PNG export.",args:{deep:W.schema.boolean().default(!1)},async execute(z,F){let X=X8(),H=await B3(),V={success:H.reachable,checks:{runtime:{status:"ok",implementation:"opencode-typescript-plugin"},workspace:{root:f5(F)},export_server:{url:X.url.toString(),...H},supported_formats:["html2","jpeg","pdf","png","svg","xmlpng","xmlsvg"],export_channels:{docker_export_server:["jpeg","pdf","png","xmlpng"],builtin_browser_editor:["html2","svg","xmlsvg"]},configuration:{timeout_seconds:X.timeoutMs/1000,max_input_size_mb:q5/1024/1024,max_output_size_mb:X.maxOutputBytes/1024/1024}}};if(z.deep&&H.reachable)try{let q=t9("HealthCheck",[{id:"health",label:"OK",kind:"default"}],[],"left-to-right",!1),L=await $8(q,"png");V.checks.deep_test={success:!0,format:"png",content_type:L.contentType,size_bytes:L.content.length}}catch(q){V.success=!1,V.checks.deep_test={success:!1,error:q.message}}else if(z.deep)V.checks.deep_test={success:!1,error:"export server is not reachable"};return JSON.stringify(V,null,2)}}),drawio_create:K({description:"Create a validated Draw.io file from a semantic graph. Use this instead of writing mxGraphModel XML directly.",args:{file:W.schema.string().describe("Workspace-relative .drawio or .xml output path"),title:W.schema.string().describe("Diagram page title"),nodes:W.schema.array(Y).describe("Diagram nodes"),edges:W.schema.array(U).default([]).describe("Diagram edges"),direction:W.schema.enum(["left-to-right","top-to-bottom"]).default("left-to-right").describe("Layered layout direction"),compressed:W.schema.boolean().default(!1).describe("Write standard compressed Draw.io page payload"),overwrite:W.schema.boolean().default(!1).describe("Allow replacement; the previous file is preserved as a timestamped backup")},async execute(z,F){nG(z.nodes,z.edges);let X=RJ(F,z.file);if(wJ(F,X))throw Error("active Draw.io sessions cannot be replaced by drawio_create; call drawio_get_state and submit an incremental revision-aware update");let H=t9(z.title,z.nodes,z.edges,z.direction,z.compressed),V=f(H),q=a(V);if(!q.valid)throw Error(`generated diagram failed validation: ${JSON.stringify(q.errors)}`);let L=await E1(X,H,z.overwrite);return JSON.stringify({created:m(F,X),backup:L.backup?m(F,L.backup):null,compressed:z.compressed,...q},null,2)}}),drawio_inspect:K({description:"Inspect a compressed or uncompressed Draw.io file and return pages, nodes, edges, geometry, and styles.",args:{file:W.schema.string().describe("Workspace-relative .drawio or .xml file")},async execute(z,F){let X=RJ(F,z.file),H=wJ(F,X),V=H?(await p(H)).xml:await jJ(X),q=f(V);return JSON.stringify({file:m(F,X),pages:q.map((L)=>({id:L.id,name:L.name,compressed:L.compressed,nodes:L.cells.filter((M)=>M.vertex),edges:L.cells.filter((M)=>M.edge)})),...a(q)},null,2)}}),drawio_quality:K({description:"Score Draw.io layout quality and report actionable issues including node overlaps, edge-node intersections, edge crossings, collinear edge overlaps, shared-port congestion, edge-label collisions, empty labels, and missing arc line jumps.",args:{file:W.schema.string().describe("Workspace-relative .drawio or .xml file"),threshold:W.schema.number().min(0).max(100).default(90).describe("Minimum accepted quality score")},async execute(z,F){let X=RJ(F,z.file),H=wJ(F,X),V=H?(await p(H)).xml:await jJ(X),q=f(V);return JSON.stringify({file:m(F,X),...r6(q,z.threshold)},null,2)}}),drawio_patch:K({description:"Apply semantic node and edge operations to an opened Draw.io file. Use dry_run first, then drawio_authorize_preview and the returned OpenCode question flow before committing. Pass annotation_id and its scoped approval when executing an annotation.",args:{file:W.schema.string().describe("Workspace-relative .drawio or .xml file"),page:W.schema.string().optional().describe("Page id or name; defaults to the first page unless annotation_id enforces the annotation page"),annotation_id:W.schema.string().optional().describe("Annotation being executed; binds the target page and is mandatory for a formal annotation-driven write"),operations:W.schema.array(Z).min(1).describe("Ordered semantic operations"),dry_run:W.schema.boolean().default(!1).describe("Return the diff and validation result without writing"),base_revision:W.schema.number().int().min(0).optional().describe("Exact revision returned by drawio_get_state; mandatory when writing an active session"),approval_token:W.schema.string().optional().describe("One-time token returned after drawio_authorize_annotation_change is approved"),preview_id:W.schema.string().optional().describe("Preview id returned by the immediately preceding active-session dry-run"),preview_approval_token:W.schema.string().optional().describe("One-time token returned by drawio_authorize_preview; annotation approval_token also authorizes its linked preview"),approval_plan:W.schema.string().optional().describe("Concise explanation shown in the OpenCode question review for a formal non-annotation write"),approval_review_id:W.schema.string().optional().describe("Review id returned before invoking OpenCode question; pass it back with approval_answer"),approval_answer:W.schema.string().optional().describe("Exact answer returned by OpenCode question; must be paired with approval_review_id")},async execute(z,F){let X=RJ(F,z.file),H=wJ(F,X),V=H?await p(H):null;if(!V&&!z.dry_run)throw Error("formal Draw.io changes require an active preview session; call drawio_open before writing");let q=z.page;if(z.annotation_id){if(!V)throw Error("annotation_id requires an active Draw.io session for this file");let N=VJ(V).get(z.annotation_id);if(!N)throw Error(`annotation not found: ${z.annotation_id}`);if(N.status!=="open")throw Error(`annotation is ${N.status} and must be reopened before processing: ${z.annotation_id}`);if(!N.pageId.trim())throw Error(`annotation has no stable page id: ${z.annotation_id}`);if(N.scope!=="diagram_wide"&&z.page&&z.page!==N.pageId&&z.page!==N.pageName)throw Error(`annotation ${z.annotation_id} is bound to page ${N.pageId}; received page ${z.page}`);q=N.scope==="diagram_wide"&&z.page?z.page:N.pageId}if(V&&!z.dry_run&&z.base_revision===void 0)throw Error("base_revision is required for an active Draw.io session; call drawio_get_state immediately before writing");let L=V&&!z.dry_run?S0(V,z.annotation_id,z.approval_token):null,M=V?.xml||await jJ(X),B=f(M),j=H5(M),O=r9(j,q),P=dG(O,z.operations);if(L)K1(L,O.id,z.operations,P);let R=M6(j),T=f(R),A=a(T);if(!A.valid)throw Error(`patched diagram failed validation: ${JSON.stringify(A.errors)}`);let D=X5(B,T);if(z.dry_run){let N=V?I5(V,M,R,O.id,P,D):null;return JSON.stringify({file:z.file,dryRun:!0,changedIds:P,diff:D,preview:N?iJ(N):null,previewGuidance:N?"The exact candidate is visible in the bound Draw.io canvas. Call drawio_authorize_preview, submit its returned arguments unchanged to OpenCode question, then retry authorization with the returned reviewId and exact answer.":"Bind the file with drawio_open or drawio_finalize to receive an interactive canvas preview.",...A},null,2)}if(V){let N=z.preview_id||L?.authorization.previewId||V.activePreviewId||void 0,C=D0(V,N,z.base_revision,R);if(!C)C=I5(V,M,R,O.id,P,D);let k=z.preview_approval_token||z.approval_token;if(!L&&!k){let x=V6(V,C,{kind:"preview",plan:z.approval_plan?.trim()||k0(C)},{reviewId:z.approval_review_id,answer:z.approval_answer});if(!x.approved)return JSON.stringify(x.payload,null,2);k=x.approvalToken}q6(V,C.id,k,z.base_revision,R);let S=await L6(V,R,z.base_revision,"agent",null,{appliedPreviewId:C.id});if(S.conflict)return JSON.stringify({file:z.file,dryRun:!1,...S},null,2);if(S.invalid)throw Error(`patched diagram failed validation: ${JSON.stringify(S.report.errors)}`);if(L)await I0(V,L);return JSON.stringify({file:m(F,X),dryRun:!1,backup:V.backupFile?m(F,V.backupFile):null,revision:V.revision,changedIds:P,diff:D,...A},null,2)}throw Error("formal Draw.io changes require an active preview session; call drawio_open before writing")}}),drawio_polish:K({description:"Run a deterministic quality loop over an opened Draw.io file. Use dry_run first, then approve the exact accepted layout through drawio_authorize_preview and OpenCode question before committing with backup.",args:{file:W.schema.string().describe("Workspace-relative .drawio or .xml file"),page:W.schema.string().optional().describe("Page id or name; defaults to the first page"),direction:W.schema.enum(["left-to-right","top-to-bottom"]).default("left-to-right").describe("Layered layout direction"),threshold:W.schema.number().min(0).max(100).default(90).describe("Minimum quality score required before writing"),dry_run:W.schema.boolean().default(!0).describe("Analyze and preview the complete diff without writing"),base_revision:W.schema.number().int().min(0).optional().describe("Exact revision returned by drawio_get_state; mandatory when writing an active session"),annotation_id:W.schema.string().optional().describe("Active annotation id; whole-page polish requires diagram_wide approval"),approval_token:W.schema.string().optional().describe("One-time diagram_wide token returned by drawio_authorize_annotation_change"),preview_id:W.schema.string().optional().describe("Preview id returned by the dry-run"),preview_approval_token:W.schema.string().optional().describe("One-time token returned by drawio_authorize_preview"),approval_plan:W.schema.string().optional().describe("Concise explanation shown in the OpenCode question review for a formal non-annotation write"),approval_review_id:W.schema.string().optional().describe("Review id returned before invoking OpenCode question; pass it back with approval_answer"),approval_answer:W.schema.string().optional().describe("Exact answer returned by OpenCode question; must be paired with approval_review_id")},async execute(z,F){let X=RJ(F,z.file),H=wJ(F,X),V=H?await p(H):null;if(!V&&!z.dry_run)throw Error("formal Draw.io changes require an active preview session; call drawio_open before writing");if(V&&!z.dry_run&&z.base_revision===void 0)throw Error("base_revision is required for an active Draw.io session; call drawio_get_state immediately before writing");let q=V&&!z.dry_run?S0(V,z.annotation_id,z.approval_token):null;if(q&&q.authorization.scope!=="diagram_wide")throw Error("drawio_polish may relayout the whole page and requires diagram_wide annotation approval; use scoped drawio_patch or request wider approval");let L=V?.xml||await jJ(X),M=f(L),B=r6(M,z.threshold),j=H5(L),O=r9(j,z.page),P=G3(O,z.direction);if(q)K1(q,O.id,[],P);let R=M6(j),T=f(R),A=r6(T,z.threshold),D=X5(M,T),N={file:m(F,X),dryRun:z.dry_run,accepted:A.pass,changedIds:P,diff:D,beforeQuality:B,afterQuality:A};if(z.dry_run){let k=V?I5(V,L,R,O.id,P,D):null;return JSON.stringify({...N,backup:null,preview:k?iJ(k):null},null,2)}if(!A.pass)throw Error(`polished diagram did not meet quality threshold ${z.threshold}; score=${A.score}, issues=${JSON.stringify(A.issues)}`);let C;if(V){let k=z.preview_id||q?.authorization.previewId||V.activePreviewId||void 0,S=D0(V,k,z.base_revision,R);if(!S)S=I5(V,L,R,O.id,P,D);let x=z.preview_approval_token||z.approval_token;if(!q&&!x){let t=V6(V,S,{kind:"preview",plan:z.approval_plan?.trim()||k0(S)},{reviewId:z.approval_review_id,answer:z.approval_answer});if(!t.approved)return JSON.stringify(t.payload,null,2);x=t.approvalToken}q6(V,S.id,x,z.base_revision,R);let b=await L6(V,R,z.base_revision,"agent",null,{appliedPreviewId:S.id});if(b.conflict)return JSON.stringify({...N,conflict:!0,current:KJ(b.current),manualChanges:b.manualChanges},null,2);if(b.invalid)throw Error(`polished diagram failed validation: ${JSON.stringify(b.report.errors)}`);if(q)await I0(V,q);C={backup:V.backupFile}}else throw Error("formal Draw.io changes require an active preview session; call drawio_open before writing");return JSON.stringify({...N,backup:C.backup?m(F,C.backup):null},null,2)}}),drawio_compare:K({description:"Compare two Draw.io files by stable page and cell ids, reporting added, removed, changed, and unchanged nodes and edges.",args:{before:W.schema.string().describe("Workspace-relative baseline .drawio, .xml, or plugin-created .bak file"),after:W.schema.string().describe("Workspace-relative updated .drawio, .xml, or plugin-created .bak file")},async execute(z,F){let X=Q8(F,z.before,n9),H=Q8(F,z.after,n9),V=f(await jJ(X)),q=f(await jJ(H));return JSON.stringify({before:m(F,X),after:m(F,H),diff:X5(V,q),beforeStats:a(V).stats,afterStats:a(q).stats},null,2)}}),drawio_get_state:K({description:"Read the latest XML and diagram-scoped persistent revision for the current session's active Draw.io file. Use this before changing a user-edited diagram.",args:{since_revision:W.schema.number().int().min(0).optional().describe("Optionally report stable-ID changes since this revision")},async execute(z,F){let X=_().sessions.get(F.sessionID);if(!X)throw Error("No active Draw.io session. Call drawio_open first.");await p(X);let H=KJ(X);if(z.since_revision!==void 0)H.changesSince=e6(X,z.since_revision);return JSON.stringify(H,null,2)}}),drawio_preview_state:K({description:"Preview an exact complete-XML candidate in the active Draw.io canvas without writing it. Use when semantic drawio_patch operations cannot express the requested change, including page backgrounds or advanced styles.",args:{base_revision:W.schema.number().int().min(0).describe("Exact revision returned by the immediately preceding drawio_get_state call"),xml:W.schema.string().min(1).describe("Complete candidate Draw.io XML"),annotation_id:W.schema.string().optional().describe("Open annotation task this candidate is intended to address")},async execute(z,F){let X=_().sessions.get(F.sessionID);if(!X)throw Error("No active Draw.io session. Call drawio_open first.");if(await p(X),z.base_revision!==X.revision)return JSON.stringify({ok:!1,error:"revision_conflict",current:KJ(X),manualChanges:e6(X,z.base_revision)},null,2);if(z.annotation_id){let O=VJ(X).get(z.annotation_id);if(!O)throw Error(`annotation not found: ${z.annotation_id}`);if(O.status!=="open")throw Error(`annotation is ${O.status} and must be reopened before previewing`)}if(z.xml.includes(AJ))throw Error("formal Draw.io XML must not contain reserved preview artifacts");let H=f(z.xml),V=a(H);if(!V.valid)return JSON.stringify({ok:!1,error:"invalid_drawio_xml",validation:V},null,2);let q=f(X.xml),L=X5(q,H);if(L.summary.added+L.summary.removed+L.summary.changed+L.pageChanges.length===0)throw Error("candidate XML is identical to the active diagram");let B=L.changed[0]?.pageId||(L.added[0]?rJ(L.added[0].key,L.added[0].cell.id):void 0)||(L.removed[0]?rJ(L.removed[0].key,L.removed[0].cell.id):void 0)||L.pageChanges[0]?.pageId||H[0]?.id||q[0]?.id||"page-1",j=I5(X,X.xml,z.xml,B,[],L);return JSON.stringify({ok:!0,dryRun:!0,file:E.relative(X.workspace,X.file).split(E.sep).join("/"),changedIds:j.changedIds,changedQualifiedIds:j.changedQualifiedIds,affectedPageIds:j.affectedPageIds,diff:L,preview:iJ(j),validation:V,previewGuidance:"The exact complete-XML candidate is visible in the bound Draw.io canvas. Compare Before and After, inspect the property list, then authorize the preview."},null,2)}}),drawio_update_state:K({description:"Apply an exact complete-XML candidate to the active Draw.io session. Preview it with drawio_preview_state, then use drawio_authorize_preview and OpenCode question; write only after revision and candidate-hash revalidation. Annotation changes still require their scoped approval.",args:{base_revision:W.schema.number().int().min(0),xml:W.schema.string().min(1),annotation_id:W.schema.string().optional().describe("Active annotation id; mandatory for an annotation-driven write"),approval_token:W.schema.string().optional().describe("One-time token returned after drawio_authorize_annotation_change is approved"),preview_id:W.schema.string().optional().describe("Preview id from drawio_preview_state; annotation approval may supply its linked preview"),preview_approval_token:W.schema.string().optional().describe("Preview approval token; annotation approval_token also authorizes its linked preview"),approval_plan:W.schema.string().optional().describe("Concise explanation shown in the OpenCode question review for a formal non-annotation write"),approval_review_id:W.schema.string().optional().describe("Review id returned before invoking OpenCode question; pass it back with approval_answer"),approval_answer:W.schema.string().optional().describe("Exact answer returned by OpenCode question; must be paired with approval_review_id")},async execute(z,F){let X=_().sessions.get(F.sessionID);if(!X)throw Error("No active Draw.io session. Call drawio_open first.");if(await p(X),z.base_revision!==X.revision)return JSON.stringify({ok:!1,error:"revision_conflict",current:KJ(X),manualChanges:e6(X,z.base_revision)},null,2);if(s(z.xml)===X.fileHash)return JSON.stringify({ok:!0,...KJ(X),validation:a(f(X.xml)),noOp:!0},null,2);let H=S0(X,z.annotation_id,z.approval_token);if(H)r3(H,f(X.xml),f(z.xml));let V=z.preview_id||H?.authorization.previewId||void 0,q=f(X.xml),L=f(z.xml),M=a(L);if(!M.valid)return JSON.stringify({ok:!1,error:"invalid_drawio_xml",validation:M},null,2);let B=X5(q,L),j=D0(X,V,z.base_revision,z.xml);if(!j){let R=B.changed[0]?.pageId||(B.added[0]?rJ(B.added[0].key,B.added[0].cell.id):void 0)||(B.removed[0]?rJ(B.removed[0].key,B.removed[0].cell.id):void 0)||B.pageChanges[0]?.pageId||L[0]?.id||q[0]?.id||"page-1";j=I5(X,X.xml,z.xml,R,[],B)}let O=z.preview_approval_token||z.approval_token;if(!H&&!O){let R=V6(X,j,{kind:"preview",plan:z.approval_plan?.trim()||k0(j)},{reviewId:z.approval_review_id,answer:z.approval_answer});if(!R.approved)return JSON.stringify(R.payload,null,2);O=R.approvalToken}q6(X,j.id,O,z.base_revision,z.xml);let P=await L6(X,z.xml,z.base_revision,"agent",null,{appliedPreviewId:j.id});if(P.conflict)return JSON.stringify({ok:!1,error:"revision_conflict",current:KJ(P.current),manualChanges:P.manualChanges},null,2);if(P.invalid)return JSON.stringify({ok:!1,error:"invalid_drawio_xml",validation:P.report},null,2);if(H)await I0(X,H);return JSON.stringify({ok:!0,...KJ(P.document),validation:P.validation},null,2)}}),drawio_open:K({description:"Bind the current Draw.io session to one validated workspace file and return a URL for OpenWork's existing built-in browser.",args:{file:W.schema.string().describe("Workspace-relative .drawio or .xml file to open"),drawio_url:W.schema.string().optional().describe("Draw.io Web URL; defaults to DRAWIO_WEB_URL or https://embed.diagrams.net")},async execute(z,F){let X=RJ(F,z.file),H=await x0(F,X),V=_0(z.drawio_url?.trim()||process.env.DRAWIO_WEB_URL?.trim()||"https://embed.diagrams.net");H.session.editorUrl=V.toString();let q=`http://${H.bridge.host}:${H.bridge.port}`,L=new URL("/editor",q);L.searchParams.set("sessionId",F.sessionID),L.searchParams.set("token",H.token);let M=U8(H.session.sessionId,X);return JSON.stringify({ok:!0,file:m(F,X).split(E.sep).join("/"),sessionId:F.sessionID,revision:H.session.revision,revisionScope:"diagram",revisionWarning:H.session.revisionWarning,openUrl:L.toString(),editorUrl:V.toString(),editorConnected:M,shouldOpenBrowser:!M,browserAction:M?"Keep the connected editor open. Do not call openwork_browser_open_url because reopening it can discard an in-progress manual edit.":"Call MobileWork's openwork_browser_open_url tool with url=openUrl and provider=builtin.",saveMode:"workspace-file",tokenExpiresAt:new Date(Date.now()+B6).toISOString()},null,2)}}),drawio_finalize:K({description:"Finish a Draw.io task: refresh the latest revision, require validation and layout quality to pass, export an up-to-date PNG, bind the browser session, and report whether a new editor must be opened. Refuses to run while any fresh (requiresConfirmation=false) annotation is still open; returns pendingAnnotations for stale open annotations that still need user confirmation. Resolved and ignored annotations are terminal and do not block finalization.",args:{file:W.schema.string().describe("Workspace-relative .drawio or .xml file"),output_path:W.schema.string().optional().describe("Workspace-relative PNG path; defaults to the input basename with .png"),threshold:W.schema.number().min(0).max(100).default(90),scale:W.schema.number().positive().default(1),border:W.schema.number().int().min(0).default(0),background:W.schema.string().default(w0).describe("PNG background color; defaults to white"),drawio_url:W.schema.string().optional().describe("Draw.io Web URL; defaults to DRAWIO_WEB_URL or https://embed.diagrams.net")},async execute(z,F){let X=RJ(F,z.file),H=wJ(F,X),V=H?(await p(H)).xml:await jJ(X),q=f(V),L=a(q);if(!L.valid)throw Error(`refusing to finalize invalid Draw.io XML: ${JSON.stringify(L.errors)}`);let M=r6(q,z.threshold);if(!M.pass)throw Error(`refusing to finalize Draw.io layout that failed the quality gate: score=${M.score}, threshold=${M.threshold}, issues=${JSON.stringify(M.issues)}`);let B=await x0(F,X),j=[...VJ(B.session).values()].filter((C)=>C.status==="open"),O=j.filter((C)=>!w5(B.session,C).requiresConfirmation);if(O.length>0)throw Error(`refusing to finalize: ${O.length} unfinished fresh annotation(s) must be handled first \u2014 `+O.map((C)=>`${C.id}: ${C.instruction.slice(0,120)}`).join(" | ")+". Handle each one (plan, get approval, write, then drawio_resolve_annotation) before calling drawio_finalize again.");let P=j.map((C)=>{let k=w5(B.session,C);return{id:C.id,instruction:C.instruction,requiresConfirmation:k.requiresConfirmation,freshness:k.freshness}}),R=await Q1({context:F,inputTarget:X,xml:V,format:"png",outputPath:z.output_path,scale:z.scale,border:z.border,background:z.background,overwrite:!0}),T=_0(z.drawio_url?.trim()||process.env.DRAWIO_WEB_URL?.trim()||"https://embed.diagrams.net");B.session.editorUrl=T.toString();let A=`http://${B.bridge.host}:${B.bridge.port}`,D=new URL("/editor",A);D.searchParams.set("sessionId",F.sessionID),D.searchParams.set("token",B.token);let N=U8(B.session.sessionId,X);return JSON.stringify({ok:!0,file:m(F,X).split(E.sep).join("/"),revision:B.session.revision,validation:L,quality:M,png:{output_path:m(F,R.outputTarget).split(E.sep).join("/"),file_size_bytes:R.bytes,content_type:R.contentType,export_url:R.exportUrl},pendingAnnotations:P,openUrl:D.toString(),editorUrl:T.toString(),editorConnected:N,shouldOpenBrowser:!N,browserAction:N?"Keep the connected editor open. Do not call openwork_browser_open_url because reopening it can discard an in-progress manual edit.":"Immediately call MobileWork's openwork_browser_open_url tool with url=openUrl and provider=builtin before ending the task.",saveMode:"workspace-file",tokenExpiresAt:new Date(Date.now()+B6).toISOString()},null,2)}}),drawio_list_annotations:K({description:"List annotation (review comment) tasks for an opened Draw.io file. Each task contains selected stable cell ids, page, region, user-selected modification scope, instruction, approval state and status.",args:{file:W.schema.string().describe("Workspace-relative .drawio or .xml file bound to the session"),status:W.schema.enum(["pending","open","fresh","stale","resolved","ignored","all"]).default("pending").describe("Filter by status; pending/open return all unfinished tasks, while fresh and stale refine them")},async execute(z,F){let X=RJ(F,z.file),H=wJ(F,X);if(!H)throw Error("No active Draw.io session for this file. Call drawio_open first.");await p(H);let q=[...VJ(H).values()].map((M)=>({task:M,state:w5(H,M)})).sort((M,B)=>B.task.updatedAt.localeCompare(M.task.updatedAt)),L=q.filter((M)=>e1(M.state,z.status)).map((M)=>aJ(H,M.task,M.state));return JSON.stringify({file:m(F,X).split(E.sep).join("/"),sessionId:H.sessionId,currentRevision:H.revision,count:L.length,counts:JQ(q.map((M)=>M.state)),annotations:L,guidance:"Pending/open include fresh and stale unfinished tasks; resolved and ignored are terminal until the user reopens them. Ask for confirmation before executing any task with requiresConfirmation=true. For each executable task: call drawio_get_annotation and drawio_get_state, dry-run, disclose scope and exact stable IDs with drawio_authorize_annotation_change, submit its returned arguments unchanged to OpenCode question, then retry authorization with approval_review_id=reviewId and approval_answer set to the exact returned answer. Only an explicit confirmation can return the one-time token. Never modify first and ask later."},null,2)}}),drawio_get_annotation:K({description:"Read one annotation task in full and make it the active guarded task, including selected stable cell ids, region, user-selected scope, instruction, base revision, staleness and latest per-cell snapshots.",args:{file:W.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),id:W.schema.string().describe("Annotation id returned by drawio_list_annotations")},async execute(z,F){let X=a6(F,z.file);if(!X)throw Error("No active Draw.io session. Call drawio_open first.");await p(X);let V=VJ(X).get(z.id);if(!V)throw Error(`annotation not found: ${z.id}`);X.activeAnnotationId=V.status==="open"?V.id:null;let q=w5(X,V),L=aJ(X,V,q),M=[];try{let B=f(X.xml),j=B.find((O)=>O.id===V.pageId)||B[0];if(j){let O=new Map(j.cells.map((P)=>[P.id,P]));M=V.cells.map((P)=>{let R=O.get(P.id);if(!R)return{id:P.id,missing:!0};let T=R.vertex?MJ(R,_5(j.cells)):null;return{id:R.id,kind:R.edge?"edge":"node",label:R.label||"",style:R.style||"",source:R.source,target:R.target,geometry:T||null,parent:R.parent}})}}catch{}return JSON.stringify({annotation:L,cellSnapshots:M,guidance:V.status!=="open"?`This annotation is ${V.status} and terminal. Do not process it unless the user reopens it in the annotation panel.`:q.requiresConfirmation?"This annotation is stale but still open. Ask the user whether to execute it. After confirmation, call drawio_get_state, generate a dry-run canvas preview and exact changed-id plan, then call drawio_authorize_annotation_change with the preview id. Complete the returned OpenCode question flow before applying the exact hash-matched candidate; resolve only after the write succeeds.":"Call drawio_get_state, generate a dry-run canvas preview and exact changed-id plan, then call drawio_authorize_annotation_change with the preview id. After approval, apply the exact hash-matched candidate and resolve the annotation."},null,2)}}),drawio_authorize_preview:K({description:"Request human approval for the exact candidate visible in the Draw.io canvas. The first call returns exact OpenCode question arguments and never writes. After question returns, retry with approval_review_id and the exact approval_answer; confirmation applies the hash-matched candidate. Cancel, close, or custom feedback never authorizes a write.",args:{file:W.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),preview_id:W.schema.string().describe("Preview id returned by drawio_patch/drawio_polish dry-run or drawio_preview_state"),plan:W.schema.string().min(1).describe("Concise explanation of the visible candidate change"),approval_review_id:W.schema.string().optional().describe("Review id returned by the first call; pass it back after OpenCode question returns"),approval_answer:W.schema.string().optional().describe("Exact answer returned by OpenCode question; must be paired with approval_review_id")},async execute(z,F){let X=a6(F,z.file);if(!X)throw Error("No active Draw.io session. Call drawio_open first.");if(await p(X),t1(X))throw Error("an annotation task is active; authorize its scoped preview with drawio_authorize_annotation_change instead");let H=_().patchPreviews.get(z.preview_id);if(!H||H.sessionId!==X.sessionId||H.diagramKey!==u(X.file))throw Error("patch preview not found for this session and diagram");if(TJ(X),H.status==="applied")return JSON.stringify({ok:!0,applied:!0,alreadyApplied:!0,...KJ(X),preview:iJ(H),guidance:"This exact preview was already applied. Do not request another approval or write it again."},null,2);if(H.status!=="pending")throw Error(`patch preview is ${H.status}; generate a fresh dry-run preview`);let V=V6(X,H,{kind:"preview",plan:z.plan},{reviewId:z.approval_review_id,answer:z.approval_answer});if(!V.approved)return JSON.stringify(V.payload,null,2);let q=V.approvalToken;q6(X,H.id,q,H.baseRevision,H.candidateXml);let L=await L6(X,H.candidateXml,H.baseRevision,"agent",null,{appliedPreviewId:H.id});if(L.conflict)return TJ(X),JSON.stringify({ok:!1,applied:!1,error:"revision_conflict",current:KJ(L.current),manualChanges:L.manualChanges},null,2);if(L.invalid)throw Error(`approved preview failed validation: ${JSON.stringify(L.report.errors)}`);return JSON.stringify({ok:!0,applied:!0,file:E.relative(X.workspace,X.file).split(E.sep).join("/"),revision:L.document.revision,backup:L.document.backupFile?E.relative(X.workspace,L.document.backupFile).split(E.sep).join("/"):null,validation:L.validation,preview:iJ(H),guidance:"The approved preview was applied immediately. Do not call drawio_patch or drawio_polish again for this candidate; finalize the diagram if an updated export is required."},null,2)}}),drawio_authorize_annotation_change:K({description:"Request the user's pre-change approval for one annotation plan. The first call returns an exact OpenCode question request and no token. After question returns, retry with approval_review_id and the exact approval_answer; confirmation returns a one-time token bound to the current revision, preview hash, declared stable IDs and requested scope. Cancel, close, or custom feedback never authorizes a write.",args:{file:W.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),id:W.schema.string().describe("Annotation id returned by drawio_get_annotation"),plan:W.schema.string().min(1).describe("Concrete pre-change explanation of what will be modified"),proposed_changed_ids:W.schema.array(W.schema.string()).min(1).describe("Complete stable-ID allowlist disclosed before writing; diagram_wide uses pageId:cellId"),requested_scope:W.schema.enum(["selection_only","selection_and_edges","surrounding_layout","diagram_wide"]).describe("Scope needed by this plan; normally equal to or narrower than the user's annotation scope"),escalation_reason:W.schema.string().optional().describe("Required when requesting a scope wider than the user originally selected"),preview_id:W.schema.string().optional().describe("Preview id returned by the immediately preceding drawio_patch dry-run; defaults to the active preview"),approval_review_id:W.schema.string().optional().describe("Review id returned by the first call; pass it back after OpenCode question returns"),approval_answer:W.schema.string().optional().describe("Exact answer returned by OpenCode question; must be paired with approval_review_id")},async execute(z,F){let X=a6(F,z.file);if(!X)throw Error("No active Draw.io session. Call drawio_open first.");await p(X);let H=VJ(X).get(z.id);if(!H)throw Error(`annotation not found: ${z.id}`);if(H.status!=="open")throw Error(`annotation is ${H.status} and must be reopened before authorization: ${z.id}`);let V=c0(z.requested_scope),q=z.escalation_reason?.trim()||null;if(W1(V)>W1(H.scope)&&!q)throw Error(`scope escalation from "${hJ(H.scope)}" to "${hJ(V)}" requires an explicit reason shown before approval`);let L=[...new Set(z.proposed_changed_ids.map((N)=>N.trim()))].filter(Boolean);if(L.length===0)throw Error("proposed_changed_ids must contain at least one stable id");let M=X.annotationAuthorizations.get(H.id);if(M&&!M.consumedAt&&M.sessionId===X.sessionId&&M.diagramKey===u(X.file)&&M.baseRevision===X.revision&&M.scope===V&&(z.preview_id||M.previewId)===M.previewId){let N=new Set(M.proposedChangedIds);if(N.size===L.length&&L.every((C)=>N.has(C)))return JSON.stringify(F1(X,H,M,!0),null,2)}let B=z.preview_id?_().patchPreviews.get(z.preview_id):TJ(X);if(!B)throw Error("annotation approval requires the active dry-run preview; generate it before requesting approval");if(B.sessionId!==X.sessionId||B.diagramKey!==u(X.file))throw Error("patch preview belongs to a different session or diagram");if(TJ(X),B.status!=="pending")throw Error(`patch preview is ${B.status}; generate a fresh dry-run preview`);let j=V==="diagram_wide"?new Set(B.changedQualifiedIds):new Set(B.changedIds),O=new Set(L);if(j.size!==O.size||[...j].some((N)=>!O.has(N)))throw Error("proposed_changed_ids must exactly match the stable IDs shown in the active preview");let P=V6(X,B,{kind:"annotation",plan:z.plan,annotationId:H.id,requestedScope:V,proposedChangedIds:L,escalationReason:q},{reviewId:z.approval_review_id,answer:z.approval_answer});if(!P.approved)return JSON.stringify(P.payload,null,2);await p(X),q6(X,B.id,P.approvalToken,B.baseRevision,B.candidateXml);let R=new Date().toISOString(),T=P.review.requestedScope||V,A=P.review.proposedChangedIds.length>0?P.review.proposedChangedIds:L,D={approvalToken:P.approvalToken,sessionId:X.sessionId,diagramKey:u(X.file),scope:T,plan:P.review.plan,proposedChangedIds:A,escalationReason:P.review.escalationReason,baseRevision:B.baseRevision,approvedAt:R,consumedAt:null,previewId:B.id};return X.annotationAuthorizations.set(H.id,D),H.updatedAt=R,X.activeAnnotationId=H.id,await P6(X),O6(X,H,"authorization-approved"),JSON.stringify(F1(X,H,D),null,2)}}),drawio_resolve_annotation:K({description:"Mark an annotation task as resolved after the requested change has been written (or after deciding no change is needed). This updates status and stores a summary; it does not modify the diagram itself.",args:{file:W.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),id:W.schema.string().describe("Annotation id to resolve"),summary:W.schema.string().describe("Short description of what was changed or why the annotation needs no change"),changed_ids:W.schema.array(W.schema.string()).optional().describe("Stable cell ids that were added, removed or modified for this annotation")},async execute(z,F){let X=a6(F,z.file);if(!X)throw Error("No active Draw.io session. Call drawio_open first.");await p(X);let H=VJ(X),V=H.get(z.id);if(!V)throw Error(`annotation not found: ${z.id}`);if(V.status!=="open")throw Error(`annotation is ${V.status} and must be reopened before it can be resolved: ${z.id}`);let q=new Date().toISOString();return V.status="resolved",V.result={summary:z.summary,changedIds:z.changed_ids||[],revision:X.revision,updatedAt:q},V.resolvedAt=q,V.ignoredAt=null,V.ignoredReason=null,V.updatedAt=q,H.set(V.id,V),J8(X,V.id),await P6(X),O6(X,V,"updated"),JSON.stringify({ok:!0,annotation:aJ(X,V)},null,2)}})};return X1.set(J,$),$}function BZ(J,Q){let Y=zU(Q)[J];if(!Y)throw Error(`Unknown Draw.io tool: ${J}`);return Y}export{$Z as initializeDrawioWorkspace,HZ as handleDrawioOpenCodeEvent,qZ as enforceDrawioWriteGuard,zU as createDrawioToolset,BZ as createDrawioTool,VZ as applyDrawioSystemGuidance,LZ as DRAWIO_TOOL_NAMES};

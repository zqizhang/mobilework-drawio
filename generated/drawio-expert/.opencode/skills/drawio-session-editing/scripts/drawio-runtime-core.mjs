// @bun
import{promises as I}from"fs";import{createHash as W0,randomBytes as i5,randomUUID as a9}from"crypto";import{createServer as ZG}from"http";import{createConnection as KG}from"net";import E from"path";var p1=":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040",d1="[:A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD]["+p1+"]*",l1=new RegExp("^"+d1+"$");function j8(J,W){let Q=[],Y=W.exec(J);while(Y){let z=[];z.startIndex=W.lastIndex-Y[0].length;let G=Y.length;for(let Z=0;Z<G;Z++)z.push(Y[Z]);Q.push(z),Y=W.exec(J)}return Q}var Z0=function(J){let W=l1.exec(J);return!(W===null||typeof W>"u")};function mJ(J){return typeof J<"u"}var _6=["hasOwnProperty","toString","valueOf","__defineGetter__","__defineSetter__","__lookupGetter__","__lookupSetter__"],M8=["__proto__","constructor","prototype"];var i1={allowBooleanAttributes:!1,unpairedTags:[]};function P8(J,W){W=Object.assign({},i1,W);let Q=[],Y=!1,z=!1;if(J[0]==="\uFEFF")J=J.substr(1);for(let G=0;G<J.length;G++)if(J[G]==="<"&&J[G+1]==="?"){if(G+=2,G=dJ(J,G),G.err)return G}else if(J[G]==="<"){let Z=G;if(G++,J[G]==="!"){G=lJ(J,G);continue}else{let F=!1;if(J[G]==="/")F=!0,G++;let U="";for(;G<J.length&&J[G]!==">"&&J[G]!==" "&&J[G]!=="\t"&&J[G]!==`
`&&J[G]!=="\r";G++)U+=J[G];if(U=U.trim(),U[U.length-1]==="/")U=U.substring(0,U.length-1),G--;if(!JQ(U)){let $;if(U.trim().length===0)$="Invalid space after '<'.";else $="Tag '"+U+"' is an invalid name.";return d("InvalidTag",$,J5(J,G))}let X=o1(J,G);if(X===!1)return d("InvalidAttr","Attributes for '"+U+"' have open quote.",J5(J,G));let K=X.value;if(G=X.index,K[K.length-1]==="/"){let $=G-K.length;K=K.substring(0,K.length-1);let H=iJ(K,W);if(H===!0)Y=!0;else return d(H.err.code,H.err.msg,J5(J,$+H.err.line))}else if(F)if(!X.tagClosed)return d("InvalidTag","Closing tag '"+U+"' doesn't have proper closing.",J5(J,G));else if(K.trim().length>0)return d("InvalidTag","Closing tag '"+U+"' can't have attributes or invalid starting.",J5(J,Z));else if(Q.length===0)return d("InvalidTag","Closing tag '"+U+"' has not been opened.",J5(J,Z));else{let $=Q.pop();if(U!==$.tagName){let H=J5(J,$.tagStartPos);return d("InvalidTag","Expected closing tag '"+$.tagName+"' (opened in line "+H.line+", col "+H.col+") instead of closing tag '"+U+"'.",J5(J,Z))}if(Q.length==0)z=!0}else{let $=iJ(K,W);if($!==!0)return d($.err.code,$.err.msg,J5(J,G-K.length+$.err.line));if(z===!0)return d("InvalidXml","Multiple possible root nodes found.",J5(J,G));else if(W.unpairedTags.indexOf(U)!==-1);else Q.push({tagName:U,tagStartPos:Z});Y=!0}for(G++;G<J.length;G++)if(J[G]==="<")if(J[G+1]==="!"){G++,G=lJ(J,G);continue}else if(J[G+1]==="?"){if(G=dJ(J,++G),G.err)return G}else break;else if(J[G]==="&"){let $=t1(J,G);if($==-1)return d("InvalidChar","char '&' is not expected.",J5(J,G));G=$}else if(z===!0&&!pJ(J[G]))return d("InvalidXml","Extra text at the end",J5(J,G));if(J[G]==="<")G--}}else{if(pJ(J[G]))continue;return d("InvalidChar","char '"+J[G]+"' is not expected.",J5(J,G))}if(!Y)return d("InvalidXml","Start tag expected.",1);else if(Q.length==1)return d("InvalidTag","Unclosed tag '"+Q[0].tagName+"'.",J5(J,Q[0].tagStartPos));else if(Q.length>0)return d("InvalidXml","Invalid '"+JSON.stringify(Q.map((G)=>G.tagName),null,4).replace(/\r?\n/g,"")+"' found.",{line:1,col:1});return!0}function pJ(J){return J===" "||J==="\t"||J===`
`||J==="\r"}function dJ(J,W){let Q=W;for(;W<J.length;W++)if(J[W]=="?"||J[W]==" "){let Y=J.substr(Q,W-Q);if(W>5&&Y==="xml")return d("InvalidXml","XML declaration allowed only at the start of the document.",J5(J,W));else if(J[W]=="?"&&J[W+1]==">"){W++;break}else continue}return W}function lJ(J,W){if(J.length>W+5&&J[W+1]==="-"&&J[W+2]==="-"){for(W+=3;W<J.length;W++)if(J[W]==="-"&&J[W+1]==="-"&&J[W+2]===">"){W+=2;break}}else if(J.length>W+8&&J[W+1]==="D"&&J[W+2]==="O"&&J[W+3]==="C"&&J[W+4]==="T"&&J[W+5]==="Y"&&J[W+6]==="P"&&J[W+7]==="E"){let Q=1;for(W+=8;W<J.length;W++)if(J[W]==="<")Q++;else if(J[W]===">"){if(Q--,Q===0)break}}else if(J.length>W+9&&J[W+1]==="["&&J[W+2]==="C"&&J[W+3]==="D"&&J[W+4]==="A"&&J[W+5]==="T"&&J[W+6]==="A"&&J[W+7]==="["){for(W+=8;W<J.length;W++)if(J[W]==="]"&&J[W+1]==="]"&&J[W+2]===">"){W+=2;break}}return W}var n1='"',r1="'";function o1(J,W){let Q="",Y="",z=!1;for(;W<J.length;W++){if(J[W]===n1||J[W]===r1)if(Y==="")Y=J[W];else if(Y!==J[W]);else Y="";else if(J[W]===">"){if(Y===""){z=!0;break}}Q+=J[W]}if(Y!=="")return!1;return{value:Q,index:W,tagClosed:z}}var a1=new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`,"g");function iJ(J,W){let Q=j8(J,a1),Y={};for(let z=0;z<Q.length;z++){if(Q[z][1].length===0)return d("InvalidAttr","Attribute '"+Q[z][2]+"' has no space in starting.",x6(Q[z]));else if(Q[z][3]!==void 0&&Q[z][4]===void 0)return d("InvalidAttr","Attribute '"+Q[z][2]+"' is without value.",x6(Q[z]));else if(Q[z][3]===void 0&&!W.allowBooleanAttributes)return d("InvalidAttr","boolean attribute '"+Q[z][2]+"' is not allowed.",x6(Q[z]));let G=Q[z][2];if(!e1(G))return d("InvalidAttr","Attribute '"+G+"' is an invalid name.",x6(Q[z]));if(!Object.prototype.hasOwnProperty.call(Y,G))Y[G]=1;else return d("InvalidAttr","Attribute '"+G+"' is repeated.",x6(Q[z]))}return!0}function s1(J,W){let Q=/\d/;if(J[W]==="x")W++,Q=/[\da-fA-F]/;for(;W<J.length;W++){if(J[W]===";")return W;if(!J[W].match(Q))break}return-1}function t1(J,W){if(W++,J[W]===";")return-1;if(J[W]==="#")return W++,s1(J,W);let Q=0;for(;W<J.length;W++,Q++){if(J[W].match(/\w/)&&Q<20)continue;if(J[W]===";")break;return-1}return W}function d(J,W,Q){return{err:{code:J,msg:W,line:Q.line||Q,col:Q.col}}}function e1(J){return Z0(J)}function JQ(J){return Z0(J)}function J5(J,W){let Q=J.substring(0,W).split(/\r?\n/);return{line:Q.length,col:Q[Q.length-1].length+1}}function x6(J){return J.startIndex+J[1].length}var K0={cent:"\xA2",pound:"\xA3",curren:"\xA4",yen:"\xA5",euro:"\u20AC",dollar:"$",fnof:"\u0192",inr:"\u20B9",af:"\u060B",birr:"\u1265\u122D",peso:"\u20B1",rub:"\u20BD",won:"\u20A9",yuan:"\xA5",cedil:"\xB8"};var h6={amp:"&",apos:"'",gt:">",lt:"<",quot:'"'},X0={nbsp:"\xA0",copy:"\xA9",reg:"\xAE",trade:"\u2122",mdash:"\u2014",ndash:"\u2013",hellip:"\u2026",laquo:"\xAB",raquo:"\xBB",lsquo:"\u2018",rsquo:"\u2019",ldquo:"\u201C",rdquo:"\u201D",bull:"\u2022",para:"\xB6",sect:"\xA7",deg:"\xB0",frac12:"\xBD",frac14:"\xBC",frac34:"\xBE"};var q6=Object.freeze({ALLOW:"allow",BLOCK:"block",THROW:"throw"}),QQ=new Set("!?\\\\/[]$%{}^&*()<>|+");function nJ(J){if(J[0]==="#")throw Error(`[EntityReplacer] Invalid character '#' in entity name: "${J}"`);for(let W of J)if(QQ.has(W))throw Error(`[EntityReplacer] Invalid character '${W}' in entity name: "${J}"`);return J}function u6(...J){let W=Object.create(null);for(let Q of J){if(!Q)continue;for(let Y of Object.keys(Q)){let z=Q[Y];if(typeof z==="string")W[Y]=z;else if(z&&typeof z==="object"&&z.val!==void 0){let G=z.val;if(typeof G==="string")W[Y]=G}}}return W}var o5="external",O8="base",F0="all";function WQ(J){if(!J||J===o5)return new Set([o5]);if(J===F0)return new Set([F0]);if(J===O8)return new Set([O8]);if(Array.isArray(J))return new Set(J);return new Set([o5])}var W5=Object.freeze({allow:0,leave:1,remove:2,throw:3}),YQ=new Set([9,10,13]);function GQ(J){if(!J)return{xmlVersion:1,onLevel:W5.allow,nullLevel:W5.remove};let W=J.xmlVersion===1.1?1.1:1,Q=W5[J.onNCR]??W5.allow,Y=W5[J.nullNCR]??W5.remove,z=Math.max(Y,W5.remove);return{xmlVersion:W,onLevel:Q,nullLevel:z}}class g6{constructor(J={}){this._limit=J.limit||{},this._maxTotalExpansions=this._limit.maxTotalExpansions||0,this._maxExpandedLength=this._limit.maxExpandedLength||0,this._postCheck=typeof J.postCheck==="function"?J.postCheck:(Q)=>Q,this._limitTiers=WQ(this._limit.applyLimitsTo??o5),this._numericAllowed=J.numericAllowed??!0,this._baseMap=u6(h6,J.namedEntities||null),this._externalMap=Object.create(null),this._inputMap=Object.create(null),this._totalExpansions=0,this._expandedLength=0,this._removeSet=new Set(J.remove&&Array.isArray(J.remove)?J.remove:[]),this._leaveSet=new Set(J.leave&&Array.isArray(J.leave)?J.leave:[]);let W=GQ(J.ncr);this._ncrXmlVersion=W.xmlVersion,this._ncrOnLevel=W.onLevel,this._ncrNullLevel=W.nullLevel,this._onExternalEntity=typeof J.onExternalEntity==="function"?J.onExternalEntity:null,this._onInputEntity=typeof J.onInputEntity==="function"?J.onInputEntity:null}_applyRegistrationHook(J,W,Q,Y){if(!J)return!0;let z=J(W,Q);if(z===q6.BLOCK)return!1;if(z===q6.THROW)throw Error(`[EntityDecoder] Registration of ${Y} entity "&${W};" was rejected by hook`);return!0}setExternalEntities(J){if(J)for(let Y of Object.keys(J))nJ(Y);if(!this._onExternalEntity){this._externalMap=u6(J);return}let W=u6(J),Q=Object.create(null);for(let[Y,z]of Object.entries(W))if(this._applyRegistrationHook(this._onExternalEntity,Y,z,"external"))Q[Y]=z;this._externalMap=Q}addExternalEntity(J,W){if(nJ(J),typeof W==="string"&&W.indexOf("&")===-1){if(this._applyRegistrationHook(this._onExternalEntity,J,W,"external"))this._externalMap[J]=W}}addInputEntities(J){if(this._totalExpansions=0,this._expandedLength=0,!this._onInputEntity){this._inputMap=u6(J);return}let W=u6(J),Q=Object.create(null);for(let[Y,z]of Object.entries(W))if(this._applyRegistrationHook(this._onInputEntity,Y,z,"input"))Q[Y]=z;this._inputMap=Q}reset(){return this._inputMap=Object.create(null),this._totalExpansions=0,this._expandedLength=0,this}setXmlVersion(J){this._ncrXmlVersion=J===1.1?1.1:1}decode(J){if(typeof J!=="string"||J.length===0)return J;if(J.indexOf("&")===-1)return J;let W=J,Q=[],Y=J.length,z=0,G=0,Z=this._maxTotalExpansions>0,F=this._maxExpandedLength>0,U=Z||F;while(G<Y){if(J.charCodeAt(G)!==38){G++;continue}let K=G+1;while(K<Y&&J.charCodeAt(K)!==59&&K-G<=32)K++;if(K>=Y||J.charCodeAt(K)!==59){G++;continue}let $=J.slice(G+1,K);if($.length===0){G++;continue}let H,q;if(this._removeSet.has($)){if(H="",q===void 0)q=o5}else if(this._leaveSet.has($)){G++;continue}else if($.charCodeAt(0)===35){let V=this._resolveNCR($);if(V===void 0){G++;continue}H=V,q=O8}else{let V=this._resolveName($);H=V?.value,q=V?.tier}if(H===void 0){G++;continue}if(G>z)Q.push(J.slice(z,G));if(Q.push(H),z=K+1,G=z,U&&this._tierCounts(q)){if(Z){if(this._totalExpansions++,this._totalExpansions>this._maxTotalExpansions)throw Error(`[EntityReplacer] Entity expansion count limit exceeded: ${this._totalExpansions} > ${this._maxTotalExpansions}`)}if(F){let V=H.length-($.length+2);if(V>0){if(this._expandedLength+=V,this._expandedLength>this._maxExpandedLength)throw Error(`[EntityReplacer] Expanded content length limit exceeded: ${this._expandedLength} > ${this._maxExpandedLength}`)}}}}if(z<Y)Q.push(J.slice(z));let X=Q.length===0?J:Q.join("");return this._postCheck(X,W)}_tierCounts(J){if(this._limitTiers.has(F0))return!0;return this._limitTiers.has(J)}_resolveName(J){if(J in this._inputMap)return{value:this._inputMap[J],tier:o5};if(J in this._externalMap)return{value:this._externalMap[J],tier:o5};if(J in this._baseMap)return{value:this._baseMap[J],tier:O8};return}_classifyNCR(J){if(J===0)return this._ncrNullLevel;if(J>=55296&&J<=57343)return W5.remove;if(this._ncrXmlVersion===1){if(J>=1&&J<=31&&!YQ.has(J))return W5.remove}return-1}_applyNCRAction(J,W,Q){switch(J){case W5.allow:return String.fromCodePoint(Q);case W5.remove:return"";case W5.leave:return;case W5.throw:throw Error(`[EntityDecoder] Prohibited numeric character reference &${W}; (U+${Q.toString(16).toUpperCase().padStart(4,"0")})`);default:return String.fromCodePoint(Q)}}_resolveNCR(J){let W=J.charCodeAt(1),Q;if(W===120||W===88)Q=parseInt(J.slice(2),16);else Q=parseInt(J.slice(1),10);if(Number.isNaN(Q)||Q<0||Q>1114111)return;let Y=this._classifyNCR(Q);if(!this._numericAllowed&&Y<W5.remove)return;let z=Y===-1?this._ncrOnLevel:Math.max(this._ncrOnLevel,Y);return this._applyNCRAction(z,J,Q)}}var rJ=(J)=>{if(_6.includes(J))return"__"+J;return J},zQ={preserveOrder:!1,attributeNamePrefix:"@_",attributesGroupName:!1,textNodeName:"#text",ignoreAttributes:!0,removeNSPrefix:!1,allowBooleanAttributes:!1,parseTagValue:!0,parseAttributeValue:!1,trimValues:!0,cdataPropName:!1,numberParseOptions:{hex:!0,leadingZeros:!0,eNotation:!0,unicode:!1},tagValueProcessor:function(J,W){return W},attributeValueProcessor:function(J,W){return W},stopNodes:[],alwaysCreateTextNode:!1,isArray:()=>!1,commentPropName:!1,unpairedTags:[],processEntities:!0,htmlEntities:!1,entityDecoder:null,ignoreDeclaration:!1,ignorePiTags:!1,transformTagName:!1,transformAttributeName:!1,updateTag:function(J,W,Q){return J},captureMetaData:!1,maxNestedTags:100,strictReservedNames:!0,jPath:!0,onDangerousProperty:rJ};function UQ(J,W){if(typeof J!=="string")return;let Q=J.toLowerCase();if(_6.some((Y)=>Q===Y.toLowerCase()))throw Error(`[SECURITY] Invalid ${W}: "${J}" is a reserved JavaScript keyword that could cause prototype pollution`);if(M8.some((Y)=>Q===Y.toLowerCase()))throw Error(`[SECURITY] Invalid ${W}: "${J}" is a reserved JavaScript keyword that could cause prototype pollution`)}function oJ(J,W){if(typeof J==="boolean")return{enabled:J,maxEntitySize:1e4,maxExpansionDepth:1e4,maxTotalExpansions:1/0,maxExpandedLength:1e5,maxEntityCount:1000,allowedTags:null,tagFilter:null,appliesTo:"all"};if(typeof J==="object"&&J!==null)return{enabled:J.enabled!==!1,maxEntitySize:Math.max(1,J.maxEntitySize??1e4),maxExpansionDepth:Math.max(1,J.maxExpansionDepth??1e4),maxTotalExpansions:Math.max(1,J.maxTotalExpansions??1/0),maxExpandedLength:Math.max(1,J.maxExpandedLength??1e5),maxEntityCount:Math.max(1,J.maxEntityCount??1000),allowedTags:J.allowedTags??null,tagFilter:J.tagFilter??null,appliesTo:J.appliesTo??"all"};return oJ(!0)}var aJ=function(J){let W=Object.assign({},zQ,J),Q=[{value:W.attributeNamePrefix,name:"attributeNamePrefix"},{value:W.attributesGroupName,name:"attributesGroupName"},{value:W.textNodeName,name:"textNodeName"},{value:W.cdataPropName,name:"cdataPropName"},{value:W.commentPropName,name:"commentPropName"}];for(let{value:Y,name:z}of Q)if(Y)UQ(Y,z);if(W.onDangerousProperty===null)W.onDangerousProperty=rJ;if(W.processEntities=oJ(W.processEntities,W.htmlEntities),W.unpairedTagsSet=new Set(W.unpairedTags),W.stopNodes&&Array.isArray(W.stopNodes))W.stopNodes=W.stopNodes.map((Y)=>{if(typeof Y==="string"&&Y.startsWith("*."))return"."+"."+Y.substring(2);return Y});return W};var C8;if(typeof Symbol!=="function")C8="@@xmlMetadata";else C8=Symbol("XML Node Metadata");class X5{constructor(J){this.tagname=J,this.child=[],this[":@"]=Object.create(null)}add(J,W){if(J==="__proto__")J="#__proto__";this.child.push({[J]:W})}addChild(J,W){if(J.tagname==="__proto__")J.tagname="#__proto__";if(J[":@"]&&Object.keys(J[":@"]).length>0)this.child.push({[J.tagname]:J.child,[":@"]:J[":@"]});else this.child.push({[J.tagname]:J.child});if(W!==void 0)this.child[this.child.length-1][C8]={startIndex:W}}static getMetaDataSymbol(){return C8}}var tJ=":A-Za-z_"+"\xC0-\xD6\xD8-\xF6\xF8-\u02FF"+"\u0370-\u037D"+"\u037F-\u0486\u0488-\u1FFF"+"\u200C-\u200D"+"\u2070-\u218F"+"\u2C00-\u2FEF"+"\u3001-\uD7FF"+"\uF900-\uFDCF"+"\uFDF0-\uFFFD",ZQ=tJ+"\\-\\.\\d"+"\xB7"+"\u0300-\u036F"+"\u203F-\u2040",eJ=":A-Za-z_"+"\xC0-\u02FF"+"\u0370-\u037D"+"\u037F-\u0486\u0488-\u1FFF"+"\u200C-\u200D"+"\u2070-\u218F"+"\u2C00-\u2FEF"+"\u3001-\uD7FF"+"\uF900-\uFDCF"+"\uFDF0-\uFFFD"+"\uD800\uDC00-\uDB7F\uDFFF",KQ=eJ+"\\-\\.\\d"+"\xB7"+"\u0300-\u036F"+"\u0487"+"\u203F-\u2040",H0=(J,W,Q="")=>{let Y=J.replace(":",""),z=W.replace(":",""),G=`[${Y}][${z}]*`;return{name:new RegExp(`^[${J}][${W}]*$`,Q),ncName:new RegExp(`^${G}$`,Q),qName:new RegExp(`^${G}(?::${G})?$`,Q),nmToken:new RegExp(`^[${W}]+$`,Q),nmTokens:new RegExp(`^[${W}]+(?:\\s+[${W}]+)*$`,Q)}},XQ=H0(tJ,ZQ),FQ=H0(eJ,KQ,"u");var HQ=":A-Za-z_\\-\\.\\d",$Q=H0(":A-Za-z_",HQ),J7=(J="1.0",W=!1)=>{if(W)return $Q;return J==="1.1"?FQ:XQ};var $0=(J,{xmlVersion:W="1.0",asciiOnly:Q=!1}={})=>J7(W,Q).qName.test(J);var sJ=["name","ncName","qName","nmToken","nmTokens"],A8=(J,{xmlVersion:W="1.0",asciiOnly:Q=!1,maxCacheSize:Y=2048}={})=>{if(!sJ.includes(J))throw TypeError(`Unknown production "${J}". Must be one of: ${sJ.join(", ")}`);let z=J7(W,Q)[J],G=new Map,Z=(F)=>{let U=G.get(F);if(U!==void 0)return U;let X=z.test(F);if(G.size<Y)G.set(F,X);return X};return Z.reset=()=>{G=new Map},Z};class R8{constructor(J,W){this.suppressValidationErr=!J,this.options=J,this.xmlVersion=W||1}setXmlVersion(J=1){this.xmlVersion=J}readDocType(J,W){let Q=Object.create(null),Y=0;if(J[W+3]==="O"&&J[W+4]==="C"&&J[W+5]==="T"&&J[W+6]==="Y"&&J[W+7]==="P"&&J[W+8]==="E"){W=W+9;let z=1,G=!1,Z=!1,F="";for(;W<J.length;W++)if(J[W]==="<"&&!Z){if(G&&a5(J,"!ENTITY",W)){W+=7;let U,X;if([U,X,W]=this.readEntityExp(J,W+1,this.suppressValidationErr),X.indexOf("&")===-1){if(this.options.enabled!==!1&&this.options.maxEntityCount!=null&&Y>=this.options.maxEntityCount)throw Error(`Entity count (${Y+1}) exceeds maximum allowed (${this.options.maxEntityCount})`);Q[U]=X,Y++}}else if(G&&a5(J,"!ELEMENT",W)){W+=8;let{index:U}=this.readElementExp(J,W+1);W=U}else if(G&&a5(J,"!ATTLIST",W))W+=8;else if(G&&a5(J,"!NOTATION",W)){W+=9;let{index:U}=this.readNotationExp(J,W+1,this.suppressValidationErr);W=U}else if(a5(J,"!--",W))Z=!0;else throw Error("Invalid DOCTYPE");z++,F=""}else if(J[W]===">"){if(Z){if(J[W-1]==="-"&&J[W-2]==="-")Z=!1,z--}else z--;if(z===0)break}else if(J[W]==="[")G=!0;else F+=J[W];if(z!==0)throw Error("Unclosed DOCTYPE")}else throw Error("Invalid Tag instead of DOCTYPE");return{entities:Q,i:W}}readEntityExp(J,W){W=Y5(J,W);let Q=W;while(W<J.length&&!/\s/.test(J[W])&&J[W]!=='"'&&J[W]!=="'")W++;let Y=J.substring(Q,W);if(c6(Y,{xmlVersion:this.xmlVersion}),W=Y5(J,W),!this.suppressValidationErr){if(J.substring(W,W+6).toUpperCase()==="SYSTEM")throw Error("External entities are not supported");else if(J[W]==="%")throw Error("Parameter entities are not supported")}let z="";if([W,z]=this.readIdentifierVal(J,W,"entity"),this.options.enabled!==!1&&this.options.maxEntitySize!=null&&z.length>this.options.maxEntitySize)throw Error(`Entity "${Y}" size (${z.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`);return W--,[Y,z,W]}readNotationExp(J,W){W=Y5(J,W);let Q=W;while(W<J.length&&!/\s/.test(J[W]))W++;let Y=J.substring(Q,W);!this.suppressValidationErr&&c6(Y,{xmlVersion:this.xmlVersion}),W=Y5(J,W);let z=J.substring(W,W+6).toUpperCase();if(!this.suppressValidationErr&&z!=="SYSTEM"&&z!=="PUBLIC")throw Error(`Expected SYSTEM or PUBLIC, found "${z}"`);W+=z.length,W=Y5(J,W);let G=null,Z=null;if(z==="PUBLIC"){if([W,G]=this.readIdentifierVal(J,W,"publicIdentifier"),W=Y5(J,W),J[W]==='"'||J[W]==="'")[W,Z]=this.readIdentifierVal(J,W,"systemIdentifier")}else if(z==="SYSTEM"){if([W,Z]=this.readIdentifierVal(J,W,"systemIdentifier"),!this.suppressValidationErr&&!Z)throw Error("Missing mandatory system identifier for SYSTEM notation")}return{notationName:Y,publicIdentifier:G,systemIdentifier:Z,index:--W}}readIdentifierVal(J,W,Q){let Y="",z=J[W];if(z!=='"'&&z!=="'")throw Error(`Expected quoted string, found "${z}"`);W++;let G=W;while(W<J.length&&J[W]!==z)W++;if(Y=J.substring(G,W),J[W]!==z)throw Error(`Unterminated ${Q} value`);return W++,[W,Y]}readElementExp(J,W){W=Y5(J,W);let Q=W;while(W<J.length&&!/\s/.test(J[W]))W++;let Y=J.substring(Q,W);if(!this.suppressValidationErr&&!$0(Y,{xmlVersion:this.xmlVersion}))throw Error(`Invalid element name: "${Y}"`);W=Y5(J,W);let z="";if(J[W]==="E"&&a5(J,"MPTY",W))W+=4;else if(J[W]==="A"&&a5(J,"NY",W))W+=2;else if(J[W]==="("){W++;let G=W;while(W<J.length&&J[W]!==")")W++;if(z=J.substring(G,W),J[W]!==")")throw Error("Unterminated content model")}else if(!this.suppressValidationErr)throw Error(`Invalid Element Expression, found "${J[W]}"`);return{elementName:Y,contentModel:z.trim(),index:W}}readAttlistExp(J,W){W=Y5(J,W);let Q=W;while(W<J.length&&!/\s/.test(J[W]))W++;let Y=J.substring(Q,W);c6(Y,{xmlVersion:this.xmlVersion}),W=Y5(J,W),Q=W;while(W<J.length&&!/\s/.test(J[W]))W++;let z=J.substring(Q,W);if(!c6(z,{xmlVersion:this.xmlVersion}))throw Error(`Invalid attribute name: "${z}"`);W=Y5(J,W);let G="";if(J.substring(W,W+8).toUpperCase()==="NOTATION"){if(G="NOTATION",W+=8,W=Y5(J,W),J[W]!=="(")throw Error(`Expected '(', found "${J[W]}"`);W++;let F=[];while(W<J.length&&J[W]!==")"){let U=W;while(W<J.length&&J[W]!=="|"&&J[W]!==")")W++;let X=J.substring(U,W);if(X=X.trim(),!c6(X,{xmlVersion:this.xmlVersion}))throw Error(`Invalid notation name: "${X}"`);if(F.push(X),J[W]==="|")W++,W=Y5(J,W)}if(J[W]!==")")throw Error("Unterminated list of notations");W++,G+=" ("+F.join("|")+")"}else{let F=W;while(W<J.length&&!/\s/.test(J[W]))W++;G+=J.substring(F,W);let U=["CDATA","ID","IDREF","IDREFS","ENTITY","ENTITIES","NMTOKEN","NMTOKENS"];if(!this.suppressValidationErr&&!U.includes(G.toUpperCase()))throw Error(`Invalid attribute type: "${G}"`)}W=Y5(J,W);let Z="";if(J.substring(W,W+8).toUpperCase()==="#REQUIRED")Z="#REQUIRED",W+=8;else if(J.substring(W,W+7).toUpperCase()==="#IMPLIED")Z="#IMPLIED",W+=7;else[W,Z]=this.readIdentifierVal(J,W,"ATTLIST");return{elementName:Y,attributeName:z,attributeType:G,defaultValue:Z,index:W}}}var Y5=(J,W)=>{while(W<J.length&&/\s/.test(J[W]))W++;return W};function a5(J,W,Q){for(let Y=0;Y<W.length;Y++)if(W[Y]!==J[Q+Y+1])return!1;return!0}function c6(J,W){if($0(J,{xmlVersion:W}))return J;else throw Error(`Invalid entity name ${J}`)}var qQ=[48,1632,1776,2406,2534,2662,2790,2918,3046,3174,3302,3430,3558,3664,3792,3872,4160,4240,6112,6160,6470,6608,6784,6800,6992,7088,7232,7248,65296,120782,120792,120802,120812,120822,66720,68912,69734,69872,69942,70096,70384,70736,70864,71248,71360,71472,71904,72016,72688,72784,73040,73120,73552,92768,92864,93008,123200,123632,124144,125264,130032],q0=255,T8=new Map;var m6=1632;var E8=new Uint8Array(63904).fill(255);for(let J of qQ)for(let W=0;W<10;W++){let Q=J+W;if(Q<=65535)E8[Q-1632]=W;else T8.set(Q,W)}var Q7=48,W7=57,Y7=45,w8=new Set([8722,65293,65123]);function VQ(J){if(typeof J!=="string")return J;let W=J.length;if(W===0)return J;let Q=-1;for(let z=0;z<W;z++){let G=J.charCodeAt(z);if(G>=Q7&&G<=W7||G===Y7)continue;if(G<m6){if(w8.has(G)){Q=z;break}continue}if(G>=55296&&G<=56319){if(z+1<W){let Z=J.charCodeAt(z+1);if(Z>=56320&&Z<=57343){let F=65536+(G-55296<<10)+(Z-56320);if(T8.has(F)){Q=z;break}}}continue}if(E8[G-m6]!==q0||w8.has(G)){Q=z;break}}if(Q===-1)return J;let Y=[];if(Q>0)Y.push(J.slice(0,Q));for(let z=Q;z<W;z++){let G=J.charCodeAt(z);if(G>=Q7&&G<=W7||G===Y7){Y.push(J[z]);continue}if(G<m6){Y.push(w8.has(G)?"-":J[z]);continue}if(G>=55296&&G<=56319){if(z+1<W){let F=J.charCodeAt(z+1);if(F>=56320&&F<=57343){let U=65536+(G-55296<<10)+(F-56320),X=T8.get(U);if(X!==void 0){Y.push(String.fromCharCode(X+48)),z++;continue}}}Y.push(J[z]);continue}if(w8.has(G)){Y.push("-");continue}let Z=E8[G-m6];Y.push(Z!==q0?String.fromCharCode(Z+48):J[z])}return Y.join("")}var G7=VQ;var LQ=/^[-+]?0x[a-fA-F0-9]+$/,BQ=/^0b[01]+$/,jQ=/^0o[0-7]+$/,MQ=/^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/,PQ={hex:!0,binary:!1,octal:!1,leadingZeros:!0,decimalPoint:".",eNotation:!0,infinity:"original",unicode:!1};function L0(J,W={}){if(W=Object.assign({},PQ,W),!J||typeof J!=="string")return J;let Q=J.trim();if(Q.length===0)return J;else if(W.skipLike!==void 0&&W.skipLike.test(Q))return J;else if(Q==="0")return 0;if(W.unicode){if(Q=G7(Q),Q==="0")return 0}if(W.hex&&LQ.test(Q))return V0(Q,16);else if(W.binary&&BQ.test(Q))return V0(Q,2);else if(W.octal&&jQ.test(Q))return V0(Q,8);else if(!isFinite(Q))return RQ(J,Number(Q),W);else if(Q.includes("e")||Q.includes("E"))return CQ(J,Q,W);else{let Y=MQ.exec(Q);if(Y){let z=Y[1]||"",G=Y[2],Z=AQ(Y[3]),F=z?J[G.length+1]===".":J[G.length]===".";if(!W.leadingZeros&&(G.length>1||G.length===1&&!F))return J;else{let U=Number(Q),X=String(U);if(U===0)return U;if(X.search(/[eE]/)!==-1)if(W.eNotation)return U;else return J;else if(Q.indexOf(".")!==-1)if(X==="0")return U;else if(X===Z)return U;else if(X===`${z}${Z}`)return U;else return J;let K=G?Z:Q;if(G)return K===X||z+K===X?U:J;else return K===X||K===z+X?U:J}}else return J}}var OQ=/^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;function CQ(J,W,Q){if(!Q.eNotation)return J;let Y=W.match(OQ);if(Y){let z=Y[1]||"",G=Y[3].indexOf("e")===-1?"E":"e",Z=Y[2],F=z?J[Z.length+1]===G:J[Z.length]===G;if(Z.length>1&&F)return J;else if(Z.length===1&&(Y[3].startsWith(`.${G}`)||Y[3][0]===G))return Number(W);else if(Z.length>0)if(Q.leadingZeros&&!F)return W=(Y[1]||"")+Y[3],Number(W);else return J;else return Number(W)}else return J}function AQ(J){if(J&&J.indexOf(".")!==-1){if(J=J.replace(/0+$/,""),J===".")J="0";else if(J[0]===".")J="0"+J;else if(J[J.length-1]===".")J=J.substring(0,J.length-1);return J}return J}function V0(J,W){let Q=J.trim();if(W===2||W===8)J=Q.substring(2);if(parseInt)return parseInt(J,W);else if(Number.parseInt)return Number.parseInt(J,W);else if(window&&window.parseInt)return window.parseInt(J,W);else throw Error("parseInt, Number.parseInt, window.parseInt are not supported")}function RQ(J,W,Q){let Y=W===1/0;switch(Q.infinity.toLowerCase()){case"null":return null;case"infinity":return W;case"string":return Y?"Infinity":"-Infinity";case"original":default:return J}}function B0(J){if(typeof J==="function")return J;if(Array.isArray(J))return(W)=>{for(let Q of J){if(typeof Q==="string"&&W===Q)return!0;if(Q instanceof RegExp&&Q.test(W))return!0}};return()=>!1}class B5{constructor(J,W={},Q){this.pattern=J,this.separator=W.separator||".",this.segments=this._parse(J),this.data=Q,this._hasDeepWildcard=this.segments.some((Y)=>Y.type==="deep-wildcard"),this._hasAttributeCondition=this.segments.some((Y)=>Y.attrName!==void 0),this._hasPositionSelector=this.segments.some((Y)=>Y.position!==void 0)}_parse(J){let W=[],Q=0,Y="";while(Q<J.length)if(J[Q]===this.separator)if(Q+1<J.length&&J[Q+1]===this.separator){if(Y.trim())W.push(this._parseSegment(Y.trim())),Y="";W.push({type:"deep-wildcard"}),Q+=2}else{if(Y.trim())W.push(this._parseSegment(Y.trim()));Y="",Q++}else Y+=J[Q],Q++;if(Y.trim())W.push(this._parseSegment(Y.trim()));return W}_parseSegment(J){let W={type:"tag"},Q=null,Y=J,z=J.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);if(z){if(Y=z[1]+z[3],z[2]){let X=z[2].slice(1,-1);if(X)Q=X}}let G=void 0,Z=Y;if(Y.includes("::")){let X=Y.indexOf("::");if(G=Y.substring(0,X).trim(),Z=Y.substring(X+2).trim(),!G)throw Error(`Invalid namespace in pattern: ${J}`)}let F=void 0,U=null;if(Z.includes(":")){let X=Z.lastIndexOf(":"),K=Z.substring(0,X).trim(),$=Z.substring(X+1).trim();if(["first","last","odd","even"].includes($)||/^nth\(\d+\)$/.test($))F=K,U=$;else F=Z}else F=Z;if(!F)throw Error(`Invalid segment pattern: ${J}`);if(W.tag=F,G)W.namespace=G;if(Q)if(Q.includes("=")){let X=Q.indexOf("=");W.attrName=Q.substring(0,X).trim(),W.attrValue=Q.substring(X+1).trim()}else W.attrName=Q.trim();if(U){let X=U.match(/^nth\((\d+)\)$/);if(X)W.position="nth",W.positionValue=parseInt(X[1],10);else W.position=U}return W}get length(){return this.segments.length}hasDeepWildcard(){return this._hasDeepWildcard}hasAttributeCondition(){return this._hasAttributeCondition}hasPositionSelector(){return this._hasPositionSelector}toString(){return this.pattern}}class p6{constructor(){this._byDepthAndTag=new Map,this._wildcardByDepth=new Map,this._deepWildcards=[],this._deepByTerminalTag=new Map,this._patterns=new Set,this._sealed=!1}add(J){if(this._sealed)throw TypeError("ExpressionSet is sealed. Create a new ExpressionSet to add more expressions.");if(this._patterns.has(J.pattern))return this;if(this._patterns.add(J.pattern),J.hasDeepWildcard()){let z=J.segments[J.segments.length-1];if(z&&z.type!=="deep-wildcard"&&z.tag!=="*"){let G=z.tag;if(!this._deepByTerminalTag.has(G))this._deepByTerminalTag.set(G,[]);this._deepByTerminalTag.get(G).push(J)}else this._deepWildcards.push(J);return this}let W=J.length,Y=J.segments[J.segments.length-1]?.tag;if(!Y||Y==="*"){if(!this._wildcardByDepth.has(W))this._wildcardByDepth.set(W,[]);this._wildcardByDepth.get(W).push(J)}else{let z=`${W}:${Y}`;if(!this._byDepthAndTag.has(z))this._byDepthAndTag.set(z,[]);this._byDepthAndTag.get(z).push(J)}return this}addAll(J){for(let W of J)this.add(W);return this}has(J){return this._patterns.has(J.pattern)}get size(){return this._patterns.size}seal(){return this._sealed=!0,this}get isSealed(){return this._sealed}matchesAny(J){return this.findMatch(J)!==null}findMatch(J){let W=J.getDepth(),Q=J.getCurrentTag(),Y=`${W}:${Q}`,z=this._byDepthAndTag.get(Y);if(z){for(let F=0;F<z.length;F++)if(J.matches(z[F]))return z[F]}let G=this._wildcardByDepth.get(W);if(G){for(let F=0;F<G.length;F++)if(J.matches(G[F]))return G[F]}let Z=this._deepByTerminalTag.get(Q);if(Z){for(let F=0;F<Z.length;F++)if(J.matches(Z[F]))return Z[F]}for(let F=0;F<this._deepWildcards.length;F++)if(J.matches(this._deepWildcards[F]))return this._deepWildcards[F];return null}}class z7{constructor(J){this._matcher=J}get separator(){return this._matcher.separator}getCurrentTag(){let J=this._matcher.path;return J.length>0?J[J.length-1].tag:void 0}getCurrentNamespace(){let J=this._matcher.path;return J.length>0?J[J.length-1].namespace:void 0}getAttrValue(J){let W=this._matcher.path;if(W.length===0)return;return W[W.length-1].values?.[J]}hasAttr(J){let W=this._matcher.path;if(W.length===0)return!1;let Q=W[W.length-1];return Q.values!==void 0&&J in Q.values}getAnyParentAttr(J){return this._matcher.getAnyParentAttr(J)}hasAnyParentAttr(J){return this._matcher.hasAnyParentAttr(J)}getPosition(){let J=this._matcher.path;if(J.length===0)return-1;return J[J.length-1].position??0}getCounter(){let J=this._matcher.path;if(J.length===0)return-1;return J[J.length-1].counter??0}getIndex(){return this.getPosition()}getDepth(){return this._matcher.path.length}toString(J,W=!0){return this._matcher.toString(J,W)}toArray(){return this._matcher.path.map((J)=>J.tag)}matches(J){return this._matcher.matches(J)}matchesAny(J){return J.matchesAny(this._matcher)}}class y5{constructor(J={}){this.separator=J.separator||".",this.path=[],this.siblingStacks=[],this._pathStringCache=null,this._view=new z7(this),this._keptAttrs=[]}push(J,W=null,Q=null,Y=null){if(this._pathStringCache=null,this.path.length>0)this.path[this.path.length-1].values=void 0;let z=this.path.length,G=this.siblingStacks[z];if(!G)G={counts:new Map,total:0},this.siblingStacks[z]=G;let Z=Q?`${Q}:${J}`:J,F=G.counts.get(Z)||0,U=G.total;G.counts.set(Z,F+1),G.total++;let X={tag:J,position:U,counter:F};if(Q!==null&&Q!==void 0)X.namespace=Q;if(W!==null&&W!==void 0)X.values=W;this.path.push(X);let K=this.path.length,$=Y!==null?Y.keep:null;if($!==null&&$!==void 0&&$.length>0&&W)for(let H=0;H<$.length;H++){let q=$[H];if(W[q]!==void 0)this._keptAttrs.push({depth:K,name:q,value:W[q]})}}pop(){if(this.path.length===0)return;this._pathStringCache=null;let J=this.path.pop();if(this.siblingStacks.length>this.path.length+1)this.siblingStacks.length=this.path.length+1;let W=this.path.length+1;while(this._keptAttrs.length>0&&this._keptAttrs[this._keptAttrs.length-1].depth>=W)this._keptAttrs.pop();return J}updateCurrent(J){if(this.path.length>0){let W=this.path[this.path.length-1];if(J!==null&&J!==void 0)W.values=J}}getCurrentTag(){return this.path.length>0?this.path[this.path.length-1].tag:void 0}getCurrentNamespace(){return this.path.length>0?this.path[this.path.length-1].namespace:void 0}getAttrValue(J){if(this.path.length===0)return;return this.path[this.path.length-1].values?.[J]}hasAttr(J){if(this.path.length===0)return!1;let W=this.path[this.path.length-1];return W.values!==void 0&&J in W.values}getAnyParentAttr(J){let W=this._keptAttrs;for(let Q=W.length-1;Q>=0;Q--)if(W[Q].name===J)return W[Q].value;return}hasAnyParentAttr(J){let W=this._keptAttrs;for(let Q=W.length-1;Q>=0;Q--)if(W[Q].name===J)return!0;return!1}getPosition(){if(this.path.length===0)return-1;return this.path[this.path.length-1].position??0}getCounter(){if(this.path.length===0)return-1;return this.path[this.path.length-1].counter??0}getIndex(){return this.getPosition()}getDepth(){return this.path.length}toString(J,W=!0){let Q=J||this.separator;if(Q===this.separator&&W===!0){if(this._pathStringCache!==null)return this._pathStringCache;let z=this.path.map((G)=>G.namespace?`${G.namespace}:${G.tag}`:G.tag).join(Q);return this._pathStringCache=z,z}return this.path.map((z)=>W&&z.namespace?`${z.namespace}:${z.tag}`:z.tag).join(Q)}toArray(){return this.path.map((J)=>J.tag)}reset(){this._pathStringCache=null,this.path=[],this.siblingStacks=[],this._keptAttrs=[]}matches(J){let W=J.segments;if(W.length===0)return!1;if(J.hasDeepWildcard())return this._matchWithDeepWildcard(W);return this._matchSimple(W)}_matchSimple(J){if(this.path.length!==J.length)return!1;for(let W=0;W<J.length;W++)if(!this._matchSegment(J[W],this.path[W],W===this.path.length-1))return!1;return!0}_matchWithDeepWildcard(J){let W=this.path.length-1,Q=J.length-1;while(Q>=0&&W>=0){let Y=J[Q];if(Y.type==="deep-wildcard"){if(Q--,Q<0)return!0;let z=J[Q],G=!1;for(let Z=W;Z>=0;Z--)if(this._matchSegment(z,this.path[Z],Z===this.path.length-1)){W=Z-1,Q--,G=!0;break}if(!G)return!1}else{if(!this._matchSegment(Y,this.path[W],W===this.path.length-1))return!1;W--,Q--}}return Q<0}_matchSegment(J,W,Q){if(J.tag!=="*"&&J.tag!==W.tag)return!1;if(J.namespace!==void 0){if(J.namespace!=="*"&&J.namespace!==W.namespace)return!1}if(J.attrName!==void 0){if(!Q)return!1;if(!W.values||!(J.attrName in W.values))return!1;if(J.attrValue!==void 0){if(String(W.values[J.attrName])!==String(J.attrValue))return!1}}if(J.position!==void 0){if(!Q)return!1;let Y=W.counter??0;if(J.position==="first"&&Y!==0)return!1;else if(J.position==="odd"&&Y%2!==1)return!1;else if(J.position==="even"&&Y%2!==0)return!1;else if(J.position==="nth"&&Y!==J.positionValue)return!1}return!0}matchesAny(J){return J.matchesAny(this)}snapshot(){return{path:this.path.map((J)=>({...J})),siblingStacks:this.siblingStacks.map((J)=>J?{counts:new Map(J.counts),total:J.total}:J),keptAttrs:this._keptAttrs.map((J)=>({...J}))}}restore(J){this._pathStringCache=null,this.path=J.path.map((W)=>({...W})),this.siblingStacks=J.siblingStacks.map((W)=>W?{counts:new Map(W.counts),total:W.total}:W),this._keptAttrs=(J.keptAttrs||[]).map((W)=>({...W}))}readOnly(){return this._view}}var TQ=[{id:"html-script-open",description:"<script opening tag",pattern:/<script[\s>/]/i},{id:"html-script-close",description:"</script closing tag",pattern:/<\/script[\s>]/i},{id:"html-javascript-protocol",description:"javascript: URI scheme (with optional whitespace/encoding)",pattern:/j[\t\n\r ]*a[\t\n\r ]*v[\t\n\r ]*a[\t\n\r ]*s[\t\n\r ]*c[\t\n\r ]*r[\t\n\r ]*i[\t\n\r ]*p[\t\n\r ]*t[\t\n\r ]*:/i},{id:"html-vbscript-protocol",description:"vbscript: URI scheme",pattern:/vbscript[\t\n\r ]*:/i},{id:"html-data-html",description:"data:text/html URI \u2014 can execute scripts in browsers",pattern:/data[\t\n\r ]*:[\t\n\r ]*text\/html/i},{id:"html-data-xhtml",description:"data:application/xhtml+xml URI",pattern:/data[\t\n\r ]*:[\t\n\r ]*application\/xhtml/i},{id:"html-data-svg",description:"data:image/svg+xml URI \u2014 can execute scripts",pattern:/data[\t\n\r ]*:[\t\n\r ]*image\/svg\+xml/i},{id:"html-inline-event-handler",description:"Inline event handler attributes: onclick=, onerror=, onload=, etc.",pattern:/\bon\w{1,30}\s*=/i},{id:"html-entity-obfuscated-script",description:"HTML-entity-encoded <script (e.g. &#x3C;script or &lt;script)",pattern:/(?:&#x0*3[Cc];?|&#0*60;?|&lt;)\s*script/i},{id:"html-entity-obfuscated-javascript",description:'HTML-entity-encoded javascript: (partial \u2014 catches common &#106; or &#x6a; for "j")',pattern:/(?:&#x0*6[Aa];?|&#0*106;?)\s*(?:&#x0*61;?|a)[\s\S]{0,80}script\s*:/i},{id:"html-style-expression",description:"CSS expression() \u2014 IE-era code execution in style attributes",pattern:/style[\s\S]{0,20}expression\s*\(/i},{id:"html-object-embed",description:"<object or <embed tags that can load active content",pattern:/<(?:object|embed)[\s>/]/i},{id:"html-base-tag",description:"<base href= \u2014 can hijack all relative URLs on a page",pattern:/<base[\s>]/i},{id:"html-meta-refresh",description:'<meta http-equiv="refresh" \u2014 can redirect users',pattern:/<meta[\s\S]{0,40}http-equiv[\s\S]{0,20}refresh/i},{id:"html-srcdoc",description:"srcdoc= attribute on iframes \u2014 embeds HTML that can run scripts",pattern:/srcdoc\s*=/i},{id:"html-iframe",description:"<iframe tag",pattern:/<iframe[\s>/]/i},{id:"html-form",description:"<form tag \u2014 can be used for phishing / credential harvesting injection",pattern:/<form[\s>/]/i}],V6=TQ;var EQ=[{id:"xml-cdata-injection",description:"CDATA section injection: <![CDATA[ breaks out of text node context",pattern:/<!\[CDATA\[/i},{id:"xml-cdata-close",description:"CDATA close sequence: ]]> can terminate an enclosing CDATA section",pattern:/\]\]>/},{id:"xml-processing-instruction",description:"XML processing instruction: <?xml-stylesheet or <?php etc.",pattern:/<\?(?:xml[\- ]|php|asp)/i},{id:"xml-doctype-injection",description:"DOCTYPE declaration embedded in content \u2014 can define entities",pattern:/<!DOCTYPE(?:[\s[]|$)/i},{id:"xml-entity-system",description:"SYSTEM keyword \u2014 used in external entity declarations (XXE)",pattern:/\bSYSTEM\s+["']/i},{id:"xml-entity-public",description:"PUBLIC keyword \u2014 used in external entity declarations (XXE)",pattern:/\bPUBLIC\s+["']/i},{id:"xml-entity-declaration",description:"<!ENTITY declaration \u2014 defines entities, potential XXE or entity expansion",pattern:/<!ENTITY[\s%]/i},{id:"xml-billion-laughs",description:"Entity reference chaining / billion laughs: repeated &eX; style references",pattern:/(?:&\w{1,20};){3,}/},{id:"xml-namespace-confusion",description:"xmlns: attribute injection \u2014 can redefine namespaces to confuse parsers",pattern:/\bxmlns\s*(?::\w{1,40})?\s*=/i},{id:"xml-comment-injection",description:"<!-- comment injection \u2014 can hide content from some parsers",pattern:/<!--/},{id:"xml-comment-close",description:"--> closes an enclosing XML comment",pattern:/-->/},{id:"xml-pi-close",description:"?> closes an enclosing processing instruction",pattern:/\?>/}],L6=EQ;var wQ=[{id:"svg-script-element",description:"<script element inside SVG executes JavaScript",pattern:/<script[\s>/]/i},{id:"svg-xlink-href-javascript",description:"xlink:href with javascript: \u2014 classic SVG XSS via <a> or <use>",pattern:/xlink\s*:\s*href\s*=\s*["']?\s*javascript\s*:/i},{id:"svg-href-javascript",description:"href= with javascript: in SVG context (<a>, <animate>, etc.)",pattern:/href\s*=\s*["']?\s*javascript\s*:/i},{id:"svg-foreignobject",description:"<foreignObject embeds HTML inside SVG \u2014 can execute scripts",pattern:/<foreignObject[\s>/]/i},{id:"svg-use-external",description:"<use xlink:href or href pointing to external resource (non-fragment URL)",pattern:/<use[\s\S]{0,60}(?:xlink\s*:\s*)?href\s*=\s*(?:["'][^#]|[^"'#\s>])/i},{id:"svg-animate-href",description:'<animate attributeName="href" \u2014 can dynamically change href to javascript:',pattern:/<animate[\s\S]{0,80}attributeName\s*=\s*["'][\s]*href["']/i},{id:"svg-animate-xlinkhref",description:'<animate attributeName="xlink:href"',pattern:/<animate[\s\S]{0,80}attributeName\s*=\s*["'][\s]*xlink\s*:\s*href["']/i},{id:"svg-set-javascript",description:'<set to="javascript:..." \u2014 sets an attribute to a javascript: URI',pattern:/<set[\s\S]{0,80}to\s*=\s*["']?\s*javascript\s*:/i},{id:"svg-event-handler",description:"SVG-specific event handler attributes: onload=, onerror=, onactivate=, etc.",pattern:/\bon(?:load|error|activate|begin|end|repeat|focus|blur|click|mouse\w{1,20}|key\w{1,20})\s*=/i},{id:"svg-handler-generic",description:"Generic on* handler catch-all for SVG attributes",pattern:/\bon\w{1,30}\s*=/i},{id:"svg-filter-feimage",description:"<feImage href= \u2014 filter primitive that can load external resources",pattern:/<feImage[\s\S]{0,80}(?:xlink\s*:\s*)?href\s*=/i},{id:"svg-image-external",description:"<image xlink:href with http/https or javascript protocol",pattern:/<image[\s\S]{0,80}(?:xlink\s*:\s*)?href\s*=\s*["']?\s*(?:https?|javascript)\s*:/i},{id:"svg-style-javascript",description:"style= attribute containing javascript: (e.g. background:url(javascript:...))",pattern:/style\s*=[\s\S]{0,60}javascript\s*:/i}],j0=wQ;var NQ=[{id:"sql-block-comment-open",description:"SQL block comment open: /* ... */ \u2014 unusual in legitimate user text",pattern:/\/\*/},{id:"sql-union-select",description:"UNION SELECT \u2014 most common SQL injection aggregation attack",pattern:/\bUNION\s{1,20}(?:ALL\s{1,20})?SELECT\b/i},{id:"sql-drop-table",description:"DROP TABLE \u2014 destructive DDL injection",pattern:/\bDROP\s{1,20}TABLE\b/i},{id:"sql-drop-database",description:"DROP DATABASE \u2014 destructive DDL injection",pattern:/\bDROP\s{1,20}DATABASE\b/i},{id:"sql-insert-into",description:"INSERT INTO \u2014 data injection",pattern:/\bINSERT\s{1,20}INTO\b/i},{id:"sql-delete-from",description:"DELETE FROM \u2014 data deletion injection",pattern:/\bDELETE\s{1,20}FROM\b/i},{id:"sql-update-set",description:"UPDATE ... SET \u2014 data modification injection",pattern:/\bUPDATE\b[\s\S]{1,60}\bSET\b/i},{id:"sql-exec-xp",description:"EXEC xp_ \u2014 MSSQL extended stored procedure execution",pattern:/\bEXEC(?:UTE)?\s{1,20}xp_/i},{id:"sql-tautology-string",description:`Classic string tautology: ' OR '1'='1 or " OR "1"="1"`,pattern:/'\s{0,10}OR\s{0,10}'[^']{0,20}'\s*=\s*'[^']{0,20}/i},{id:"sql-tautology-numeric",description:"Numeric tautology: OR 1=1",pattern:/\bOR\s{1,10}1\s*=\s*1\b/i},{id:"sql-always-true-zero",description:"Numeric tautology: OR 0=0",pattern:/\bOR\s{1,10}0\s*=\s*0\b/i},{id:"sql-sleep-benchmark",description:"Time-based blind injection: SLEEP() or BENCHMARK()",pattern:/\b(?:SLEEP|BENCHMARK)\s*\(/i},{id:"sql-waitfor-delay",description:"MSSQL time-based blind injection: WAITFOR DELAY",pattern:/\bWAITFOR\s{1,20}DELAY\b/i},{id:"sql-char-function",description:"CHAR() function \u2014 used to obfuscate injected strings",pattern:/\bCHAR\s*\(\s*\d{1,3}/i},{id:"sql-information-schema",description:"INFORMATION_SCHEMA \u2014 reconnaissance query for table/column enumeration",pattern:/\bINFORMATION_SCHEMA\b/i}],d6=NQ;var DQ=[{id:"shell-path-traversal-unix",description:"Unix path traversal: parent slash  \u2014 climbing the directory tree",pattern:/\.\.\//},{id:"shell-path-traversal-windows",description:"Windows path traversal: parent backslash \u2014 climbing the directory tree",pattern:/\.\.\\/},{id:"shell-path-traversal-encoded",description:"URL-encoded path traversal: %2e%2e or %2f variants",pattern:/%2e%2e|%2f\.\.|\.\.%2f/i},{id:"shell-null-byte",description:"Null byte injection: \\x00 or %00 \u2014 truncates strings in C-backed functions",pattern:/\x00|%00/},{id:"shell-semicolon",description:"Semicolon command separator: cmd1; cmd2",pattern:/;/},{id:"shell-pipe",description:"Pipe operator: cmd1 | cmd2",pattern:/\|/},{id:"shell-and-operator",description:"AND operator: cmd1 && cmd2",pattern:/&&/},{id:"shell-or-operator",description:"OR operator: cmd1 || cmd2",pattern:/\|\|/},{id:"shell-backtick",description:"Backtick command substitution: `cmd`",pattern:/`/},{id:"shell-dollar-paren",description:"Dollar-paren command substitution: $(cmd)",pattern:/\$\(/},{id:"shell-dollar-brace",description:"Dollar-brace variable expansion: ${var} \u2014 can be abused for injection",pattern:/\$\{/},{id:"shell-redirect-out",description:"Output redirection: cmd > file or cmd >> file",pattern:/>{1,2}/},{id:"shell-redirect-in",description:"Input redirection: cmd < file",pattern:/</},{id:"shell-newline-injection",description:"Newline injection: \\n or \\r \u2014 can inject new shell commands",pattern:/[\n\r]/},{id:"shell-glob-star",description:"Glob expansion: * or ? \u2014 can expand to unintended files",pattern:/[/\\][*?]/},{id:"shell-absolute-root",description:"Absolute root path injection: string starting with / or \\ (Windows UNC)",pattern:/^(?:\/|\\\\)/},{id:"shell-windows-drive",description:"Windows drive letter path injection: C:\\ or D:/",pattern:/^[a-zA-Z]:[/\\]/},{id:"shell-curl-wget",description:"curl/wget with URL or flags \u2014 can exfiltrate data or download payloads",pattern:/\b(?:curl|wget)\s+(?:https?:\/\/|ftp:\/\/|-)/i}],M0=DQ;var kQ=[{id:"redos-nested-quantifier-plus",description:"Nested + quantifier inside a group with outer quantifier: (a+)+, (.+b)*, etc.",pattern:/\([^)]*\+[^)]*\)[+*]/},{id:"redos-nested-quantifier-star",description:"Nested * quantifier: (a*)* or (a*)+ \u2014 catastrophic backtracking",pattern:/\([^)]*\*[^)]*\)[*+]/},{id:"redos-nested-groups",description:"Doubly nested quantified groups: ((a+)+) \u2014 guaranteed catastrophic",pattern:/\(\([^)]{0,40}\)[+*]\)[+*]/},{id:"redos-alternation-overlap",description:"Overlapping alternation under quantifier: (a|a)+ \u2014 ambiguous NFA paths",pattern:/\(([^|()]{1,20})\|(?:\1)(?:\|[^|()]{1,20}){0,5}\)[+*?]{1,2}/},{id:"redos-star-plus-concat",description:"(x*x)+ pattern \u2014 triggers super-linear backtracking",pattern:/\([^)]{0,10}\*[^)]{0,10}\)[+*]/},{id:"redos-dot-star-greedy",description:"(.*){n,} or (.+){n,} \u2014 repeated greedy dot quantifiers",pattern:/\(\.[*+]\)\{?\d/},{id:"redos-large-repetition",description:"Very large fixed or range repetition count {1000,} or {1000,n} \u2014 denial of service via backtracking",pattern:/\{\d{4,}(?:,\d*)?\}/},{id:"redos-catastrophic-alternation",description:"Long alternation with many similar branches \u2014 polynomial backtracking risk",pattern:/\([^)]{0,200}(?:\|[^|)]{0,50}){9,}\)/}],P0=kQ;var SQ=[{id:"nosql-where-operator",description:"$where \u2014 executes arbitrary JavaScript server-side in MongoDB",pattern:new RegExp(`\\$where["'\\s]*:`,"i")},{id:"nosql-ne-operator",description:'$ne \u2014 "not equal" operator used to bypass equality checks',pattern:new RegExp(`\\$ne["'\\s]*:`,"i")},{id:"nosql-gt-operator",description:'$gt \u2014 "greater than" used to bypass password/value checks',pattern:new RegExp(`\\$gte?["'\\s]*:`,"i")},{id:"nosql-lt-operator",description:'$lt / $lte \u2014 "less than" bypass variants',pattern:new RegExp(`\\$lte?["'\\s]*:`,"i")},{id:"nosql-regex-operator",description:"$regex \u2014 can be used to extract data character by character (blind injection)",pattern:new RegExp(`\\$regex["'\\s]*:`,"i")},{id:"nosql-or-operator",description:"$or \u2014 logical OR; used to create always-true conditions",pattern:new RegExp(`\\$or["'\\s]*:\\s*\\[`,"i")},{id:"nosql-and-operator",description:"$and \u2014 logical AND operator injection",pattern:new RegExp(`\\$and["'\\s]*:\\s*\\[`,"i")},{id:"nosql-nor-operator",description:"$nor \u2014 logical NOR operator injection",pattern:new RegExp(`\\$nor["'\\s]*:\\s*\\[`,"i")},{id:"nosql-exists-operator",description:"$exists \u2014 can enumerate fields to determine schema",pattern:new RegExp(`\\$exists["'\\s]*:`,"i")},{id:"nosql-in-operator",description:"$in \u2014 matches any value in a list; can enumerate values",pattern:new RegExp(`\\$in["'\\s]*:\\s*\\[`,"i")},{id:"nosql-expr-operator",description:"$expr \u2014 allows aggregation expressions in queries (MongoDB 3.6+)",pattern:new RegExp(`\\$expr["'\\s]*:`,"i")},{id:"nosql-function-operator",description:"$function \u2014 executes arbitrary JavaScript in MongoDB 4.4+",pattern:new RegExp(`\\$function["'\\s]*:`,"i")},{id:"nosql-accumulator-operator",description:"$accumulator \u2014 custom aggregation with arbitrary JS execution",pattern:new RegExp(`\\$accumulator["'\\s]*:`,"i")},{id:"nosql-proto-pollution",description:"__proto__ \u2014 prototype pollution via object key injection",pattern:/__proto__/},{id:"nosql-constructor-prototype",description:"constructor.prototype \u2014 alternative prototype pollution vector (dot notation or JSON key)",pattern:/constructor[\s"':.,{\[]*prototype/i},{id:"nosql-proto-bracket",description:'["__proto__"] \u2014 bracket-notation prototype pollution',pattern:/\[["']__proto__["']\]/}],O0=SQ;var IQ=[{id:"log-crlf-injection",description:"CRLF injection: literal \\r or \\n embeds fake log lines",pattern:/[\r\n]/},{id:"log-url-encoded-crlf",description:"URL-encoded CRLF: %0d, %0a, %0D, %0A \u2014 decoded by some log parsers",pattern:/%0[dDaA]/},{id:"log-unicode-newline",description:"Unicode newline variants: U+2028 (line separator), U+2029 (paragraph separator)",pattern:/[\u2028\u2029]/},{id:"log-log4shell-jndi",description:"Log4Shell: ${jndi:...} triggers remote code execution in Apache Log4j",pattern:/\$\{jndi\s*:/i},{id:"log-log4shell-obfuscated",description:"Obfuscated Log4Shell: ${::-j}... lookup-bypass prefix used to evade WAF detection",pattern:/\$\{::-/},{id:"log-log4j-lookup",description:"Log4j lookup syntax: ${env:...}, ${sys:...}, ${ctx:...} \u2014 data exfiltration",pattern:/\$\{(?:env|sys|ctx|main|map|sd|web|docker|k8s|spring)\s*:/i},{id:"log-ssti-double-brace",description:"SSTI double-brace: {{expression}} \u2014 Jinja2, Twig, Handlebars, etc.",pattern:/\{\{[\s\S]{0,80}\}\}/},{id:"log-ssti-hash-brace",description:"SSTI hash-brace: #{expression} \u2014 Thymeleaf, Velocity, Ruby ERB",pattern:/#\{[\s\S]{0,80}\}/},{id:"log-ssti-dollar-brace",description:"SSTI/EL injection: ${expression with operators or method calls} \u2014 JSP EL, Freemarker, SpEL",pattern:/\$\{[^}]*(?:\.|\(|\*|\+|\bclass\b|\bruntime\b|\bprocess\b|\bexec\b)[^}]{0,80}\}/i},{id:"log-ssti-percent-tag",description:"SSTI ERB/ASP tag: <%= expression %> \u2014 Ruby ERB, ASP",pattern:/<%=[\s\S]{0,80}%>/},{id:"log-null-byte",description:"Null byte: \\x00 or %00 \u2014 can truncate log entries in C-backed loggers",pattern:/\x00|%00/},{id:"log-ansi-escape",description:"ANSI escape sequence: ESC[ \u2014 can manipulate terminal output when logs are tailed",pattern:/\x1b\[/}],C0=IQ;var yQ=[{id:"sql-line-comment",description:"SQL line comment: -- followed by whitespace or end of string",pattern:/--(?:\s|$)/},{id:"sql-stacked-query",description:"Stacked queries: semicolon immediately followed by a SQL keyword",pattern:/;\s{0,10}(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b/i},{id:"sql-hex-encoding",description:"Hex-encoded string injection: 0x41414141 style (MySQL)",pattern:/\b0x[0-9a-f]{4,}/i}],bQ=[...d6,...yQ],A0=bQ;V6.label="HTML";L6.label="XML";j0.label="SVG";d6.label="SQL";A0.label="SQL-STRICT";M0.label="SHELL";P0.label="REDOS";O0.label="NOSQL";C0.label="LOG";var mz=Object.freeze({HTML:V6,XML:L6,SVG:j0,SQL:d6,"SQL-STRICT":A0,SHELL:M0,REDOS:P0,NOSQL:O0,LOG:C0});function fQ(J){if(typeof J!=="string")throw TypeError(`is-unsafe: first argument must be a string, got ${typeof J}`)}function vQ(J){if(J instanceof RegExp)return;if(Array.isArray(J)){if(J.length===0)throw TypeError("is-unsafe: context must not be an empty array");if(Array.isArray(J[0])){for(let W of J)if(!Array.isArray(W)||W.length===0)throw TypeError("is-unsafe: each context in the array must be a non-empty pattern array (PatternList)")}return}throw TypeError(`is-unsafe: second argument must be a PatternList (e.g. HTML), an array of PatternLists (e.g. [HTML, XML]), or a RegExp. Got: ${typeof J}`)}function _Q(J){if(J instanceof RegExp)return{lists:null,regex:J};if(Array.isArray(J[0]))return{lists:J,regex:null};return{lists:[J],regex:null}}function xQ(J,W){let Q=W.label??"CUSTOM";for(let Y of W)if(Y.pattern.test(J))return{context:Q,id:Y.id,description:Y.description,pattern:Y.pattern};return null}function U7(J,W){fQ(J),vQ(W);let{lists:Q,regex:Y}=_Q(W);if(Y)return Y.test(J);for(let z of Q)if(xQ(J,z)!==null)return!0;return!1}function hQ(J,W){if(!J)return{};let Q=W.attributesGroupName?J[W.attributesGroupName]:J;if(!Q)return{};let Y={};for(let z in Q)if(z.startsWith(W.attributeNamePrefix)){let G=z.substring(W.attributeNamePrefix.length);Y[G]=Q[z]}else Y[z]=Q[z];return Y}function uQ(J){if(!J||typeof J!=="string")return;let W=J.indexOf(":");if(W!==-1&&W>0){let Q=J.substring(0,W);if(Q!=="xmlns")return Q}return}class N8{constructor(J,W){this.options=J,this.currentNode=null,this.tagsNodeStack=[],this.parseXml=dQ,this.parseTextData=gQ,this.resolveNameSpace=cQ,this.buildAttributesMap=pQ,this.isItStopNode=rQ,this.replaceEntitiesValue=iQ,this.readStopNodeData=sQ,this.saveTextToParentTag=nQ,this.addChild=lQ,this.ignoreAttributesFn=B0(this.options.ignoreAttributes),this.entityExpansionCount=0,this.currentExpandedLength=0,this.doctypefound=!1;let Q={...h6};if(this.options.entityDecoder)this.entityDecoder=this.options.entityDecoder;else{if(typeof this.options.htmlEntities==="object")Q=this.options.htmlEntities;else if(this.options.htmlEntities===!0)Q={...X0,...K0};this.entityDecoder=new g6({namedEntities:{...Q,...W},numericAllowed:this.options.htmlEntities,limit:{maxTotalExpansions:this.options.processEntities.maxTotalExpansions,maxExpandedLength:this.options.processEntities.maxExpandedLength,applyLimitsTo:this.options.processEntities.appliesTo},onInputEntity:(z,G)=>U7(G,[V6,L6])?q6.BLOCK:q6.ALLOW})}this.matcher=new y5,this.readonlyMatcher=this.matcher.readOnly(),this.isCurrentNodeStopNode=!1,this.stopNodeExpressionsSet=new p6;let Y=this.options.stopNodes;if(Y&&Y.length>0){for(let z=0;z<Y.length;z++){let G=Y[z];if(typeof G==="string")this.stopNodeExpressionsSet.add(new B5(G));else if(G instanceof B5)this.stopNodeExpressionsSet.add(G)}this.stopNodeExpressionsSet.seal()}}}function gQ(J,W,Q,Y,z,G,Z){let F=this.options;if(J!==void 0){if(F.trimValues&&!Y)J=J.trim();if(J.length>0){if(!Z)J=this.replaceEntitiesValue(J,W,Q);let U=F.jPath?Q.toString():Q,X=F.tagValueProcessor(W,J,U,z,G);if(X===null||X===void 0)return J;else if(typeof X!==typeof J||X!==J)return X;else if(F.trimValues)return E0(J,F.parseTagValue,F.numberParseOptions);else if(J.trim()===J)return E0(J,F.parseTagValue,F.numberParseOptions);else return J}}}function cQ(J){if(this.options.removeNSPrefix){let W=J.split(":"),Q=J.charAt(0)==="/"?"/":"";if(W[0]==="xmlns")return"";if(W.length===2)J=Q+W[1]}return J}var mQ=new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`,"gm");function pQ(J,W,Q,Y=!1){let z=this.options;if(Y===!0||z.ignoreAttributes!==!0&&typeof J==="string"){let G=j8(J,mQ),Z=G.length,F={},U=Array(Z),X=!1,K={};for(let q=0;q<Z;q++){let V=this.resolveNameSpace(G[q][1]),L=G[q][4];if(V.length&&L!==void 0){let B=L;if(z.trimValues)B=B.trim();B=this.replaceEntitiesValue(B,Q,this.readonlyMatcher),U[q]=B,K[V]=B,X=!0}}if(X&&typeof W==="object"&&W.updateCurrent)W.updateCurrent(K);let $=z.jPath?W.toString():this.readonlyMatcher,H=!1;for(let q=0;q<Z;q++){let V=this.resolveNameSpace(G[q][1]);if(this.ignoreAttributesFn(V,$))continue;let L=z.attributeNamePrefix+V;if(V.length){if(z.transformAttributeName)L=z.transformAttributeName(L);if(L=Z7(L,z),G[q][4]!==void 0){let B=U[q],O=z.attributeValueProcessor(V,B,$);if(O===null||O===void 0)F[L]=B;else if(typeof O!==typeof B||O!==B)F[L]=O;else F[L]=E0(B,z.parseAttributeValue,z.numberParseOptions);H=!0}else if(z.allowBooleanAttributes)F[L]=!0,H=!0}}if(!H)return;if(z.attributesGroupName&&!z.preserveOrder){let q={};return q[z.attributesGroupName]=F,q}return F}}var dQ=function(J){J=J.replace(/\r\n?/g,`
`);let W=new X5("!xml"),Q=W,Y="";this.matcher.reset(),this.entityDecoder.reset(),this.entityExpansionCount=0,this.currentExpandedLength=0,this.doctypefound=!1;let z=this.options,G=new R8(z.processEntities),Z=J.length;for(let F=0;F<Z;F++)if(J[F]==="<"){let X=J.charCodeAt(F+1);if(X===47){let K=B6(J,">",F,"Closing Tag is not closed."),$=J.substring(F+2,K).trim();if(z.removeNSPrefix){let q=$.indexOf(":");if(q!==-1)$=$.substr(q+1)}if($=R0(z.transformTagName,$,"",z).tagName,Q)Y=this.saveTextToParentTag(Y,Q,this.readonlyMatcher);let H=this.matcher.getCurrentTag();if($&&z.unpairedTagsSet.has($))throw Error(`Unpaired tag can not be used as closing tag: </${$}>`);if(H&&z.unpairedTagsSet.has(H))this.matcher.pop(),this.tagsNodeStack.pop();this.matcher.pop(),this.isCurrentNodeStopNode=!1,Q=this.tagsNodeStack.pop(),Y="",F=K}else if(X===63){let K=T0(J,F,!1,"?>");if(!K)throw Error("Pi Tag is not closed.");Y=this.saveTextToParentTag(Y,Q,this.readonlyMatcher);let $=this.buildAttributesMap(K.tagExp,this.matcher,K.tagName,!0);if($){let H=$[this.options.attributeNamePrefix+"version"];this.entityDecoder.setXmlVersion(Number(H)||1),G.setXmlVersion(Number(H)||1)}if(z.ignoreDeclaration&&K.tagName==="?xml"||z.ignorePiTags);else{let H=new X5(K.tagName);if(H.add(z.textNodeName,""),K.tagName!==K.tagExp&&K.attrExpPresent&&z.ignoreAttributes!==!0)H[":@"]=$;this.addChild(Q,H,this.readonlyMatcher,F)}F=K.closeIndex+1}else if(X===33&&J.charCodeAt(F+2)===45&&J.charCodeAt(F+3)===45){let K=B6(J,"-->",F+4,"Comment is not closed.");if(z.commentPropName){let $=J.substring(F+4,K-2);Y=this.saveTextToParentTag(Y,Q,this.readonlyMatcher),Q.add(z.commentPropName,[{[z.textNodeName]:$}])}F=K}else if(X===33&&J.charCodeAt(F+2)===68){if(this.doctypefound)throw Error("Multiple DOCTYPE declarations found.");this.doctypefound=!0;let K=G.readDocType(J,F);this.entityDecoder.addInputEntities(K.entities),F=K.i}else if(X===33&&J.charCodeAt(F+2)===91){let K=B6(J,"]]>",F,"CDATA is not closed.")-2,$=J.substring(F+9,K);Y=this.saveTextToParentTag(Y,Q,this.readonlyMatcher);let H=this.parseTextData($,Q.tagname,this.readonlyMatcher,!0,!1,!0,!0);if(H==null)H="";if(z.cdataPropName)Q.add(z.cdataPropName,[{[z.textNodeName]:$}]);else Q.add(z.textNodeName,H);F=K+2}else{let K=T0(J,F,z.removeNSPrefix);if(!K){let w=J.substring(Math.max(0,F-50),Math.min(Z,F+50));throw Error(`readTagExp returned undefined at position ${F}. Context: "${w}"`)}let{tagName:$,rawTagName:H,tagExp:q,attrExpPresent:V,closeIndex:L}=K;if({tagName:$,tagExp:q}=R0(z.transformTagName,$,q,z),z.strictReservedNames&&($===z.commentPropName||$===z.cdataPropName||$===z.textNodeName||$===z.attributesGroupName))throw Error(`Invalid tag name: ${$}`);if(Q&&Y){if(Q.tagname!=="!xml")Y=this.saveTextToParentTag(Y,Q,this.readonlyMatcher,!1)}let B=Q;if(B&&z.unpairedTagsSet.has(B.tagname))Q=this.tagsNodeStack.pop(),this.matcher.pop();let O=!1;if(q.length>0&&q.lastIndexOf("/")===q.length-1){if(O=!0,$[$.length-1]==="/")$=$.substr(0,$.length-1),q=$;else q=q.substr(0,q.length-1);V=$!==q}let j=null,P={},M=void 0;if(M=uQ(H),$!==W.tagname)this.matcher.push($,{},M);if($!==q&&V){if(j=this.buildAttributesMap(q,this.matcher,$),j)P=hQ(j,z)}if($!==W.tagname)this.isCurrentNodeStopNode=this.isItStopNode();let T=F;if(this.isCurrentNodeStopNode){let w="";if(O)F=K.closeIndex;else if(z.unpairedTagsSet.has($))F=K.closeIndex;else{let D=this.readStopNodeData(J,H,L+1);if(!D)throw Error(`Unexpected end of ${H}`);F=D.i,w=D.tagContent}let C=new X5($);if(j)C[":@"]=j;C.add(z.textNodeName,w),this.matcher.pop(),this.isCurrentNodeStopNode=!1,this.addChild(Q,C,this.readonlyMatcher,T)}else{if(O){({tagName:$,tagExp:q}=R0(z.transformTagName,$,q,z));let w=new X5($);if(j)w[":@"]=j;this.addChild(Q,w,this.readonlyMatcher,T),this.matcher.pop(),this.isCurrentNodeStopNode=!1}else if(z.unpairedTagsSet.has($)){let w=new X5($);if(j)w[":@"]=j;this.addChild(Q,w,this.readonlyMatcher,T),this.matcher.pop(),this.isCurrentNodeStopNode=!1,F=K.closeIndex;continue}else{let w=new X5($);if(this.tagsNodeStack.length>z.maxNestedTags)throw Error("Maximum nested tags exceeded");if(this.tagsNodeStack.push(Q),j)w[":@"]=j;this.addChild(Q,w,this.readonlyMatcher,T),Q=w}Y="",F=L}}}else Y+=J[F];return W.child};function lQ(J,W,Q,Y){if(!this.options.captureMetaData)Y=void 0;let z=this.options.jPath?Q.toString():Q,G=this.options.updateTag(W.tagname,z,W[":@"]);if(G===!1);else if(typeof G==="string")W.tagname=G,J.addChild(W,Y);else J.addChild(W,Y)}function iQ(J,W,Q){let Y=this.options.processEntities;if(!Y||!Y.enabled)return J;if(Y.allowedTags){let z=this.options.jPath?Q.toString():Q;if(!(Array.isArray(Y.allowedTags)?Y.allowedTags.includes(W):Y.allowedTags(W,z)))return J}if(Y.tagFilter){let z=this.options.jPath?Q.toString():Q;if(!Y.tagFilter(W,z))return J}return this.entityDecoder.decode(J)}function nQ(J,W,Q,Y){if(J){if(Y===void 0)Y=W.child.length===0;if(J=this.parseTextData(J,W.tagname,Q,!1,W[":@"]?Object.keys(W[":@"]).length!==0:!1,Y),J!==void 0&&J!=="")W.add(this.options.textNodeName,J);J=""}return J}function rQ(){if(this.stopNodeExpressionsSet.size===0)return!1;return this.matcher.matchesAny(this.stopNodeExpressionsSet)}function oQ(J,W,Q=">"){let Y=0,z=J.length,G=Q.charCodeAt(0),Z=Q.length>1?Q.charCodeAt(1):-1,F="",U=W;for(let X=W;X<z;X++){let K=J.charCodeAt(X);if(Y){if(K===Y)Y=0}else if(K===34||K===39)Y=K;else if(K===G)if(Z!==-1){if(J.charCodeAt(X+1)===Z)return F+=J.substring(U,X),{data:F,index:X}}else return F+=J.substring(U,X),{data:F,index:X};else if(K===9&&!Y)F+=J.substring(U,X)+" ",U=X+1}}function B6(J,W,Q,Y){let z=J.indexOf(W,Q);if(z===-1)throw Error(Y);else return z+W.length-1}function aQ(J,W,Q,Y){let z=J.indexOf(W,Q);if(z===-1)throw Error(Y);return z}function T0(J,W,Q,Y=">"){let z=oQ(J,W+1,Y);if(!z)return;let{data:G,index:Z}=z,F=G.search(/\s/),U=G,X=!0;if(F!==-1)U=G.substring(0,F),G=G.substring(F+1).trimStart();let K=U;if(Q){let $=U.indexOf(":");if($!==-1)U=U.substr($+1),X=U!==z.data.substr($+1)}return{tagName:U,tagExp:G,closeIndex:Z,attrExpPresent:X,rawTagName:K}}function sQ(J,W,Q){let Y=Q,z=1,G=J.length;for(;Q<G;Q++)if(J[Q]==="<"){let Z=J.charCodeAt(Q+1);if(Z===47){let F=aQ(J,">",Q,`${W} is not closed`);if(J.substring(Q+2,F).trim()===W){if(z--,z===0)return{tagContent:J.substring(Y,Q),i:F}}Q=F}else if(Z===63)Q=B6(J,"?>",Q+1,"StopNode is not closed.");else if(Z===33&&J.charCodeAt(Q+2)===45&&J.charCodeAt(Q+3)===45)Q=B6(J,"-->",Q+3,"StopNode is not closed.");else if(Z===33&&J.charCodeAt(Q+2)===91)Q=B6(J,"]]>",Q,"StopNode is not closed.")-2;else{let F=T0(J,Q,!1);if(F){if((F&&F.tagName)===W&&F.tagExp[F.tagExp.length-1]!=="/")z++;Q=F.closeIndex}}}}function E0(J,W,Q){if(W&&typeof J==="string"){let Y=J.trim();if(Y==="true")return!0;else if(Y==="false")return!1;else return L0(J,Q)}else if(mJ(J))return J;else return""}function R0(J,W,Q,Y){if(J){let z=J(W);if(Q===W)Q=z;W=z}return W=Z7(W,Y),{tagName:W,tagExp:Q}}function Z7(J,W){if(M8.includes(J))throw Error(`[SECURITY] Invalid name: "${J}" is a reserved JavaScript keyword that could cause prototype pollution`);else if(_6.includes(J))return W.onDangerousProperty(J);return J}var w0=X5.getMetaDataSymbol();function tQ(J,W){if(!J||typeof J!=="object")return{};if(!W)return J;let Q={};for(let Y in J)if(Y.startsWith(W)){let z=Y.substring(W.length);Q[z]=J[Y]}else Q[Y]=J[Y];return Q}function N0(J,W,Q,Y){return K7(J,W,Q,Y)}function K7(J,W,Q,Y){let z,G={};for(let Z=0;Z<J.length;Z++){let F=J[Z],U=eQ(F);if(U!==void 0&&U!==W.textNodeName){let X=tQ(F[":@"]||{},W.attributeNamePrefix);Q.push(U,X)}if(U===W.textNodeName)if(z===void 0)z=F[U];else z+=""+F[U];else if(U===void 0)continue;else if(F[U]){let X=K7(F[U],W,Q,Y),K=QW(X,W);if(Object.keys(X).length===0&&W.alwaysCreateTextNode)X[W.textNodeName]="";if(F[":@"])JW(X,F[":@"],Y,W);else if(Object.keys(X).length===1&&X[W.textNodeName]!==void 0&&!W.alwaysCreateTextNode)X=X[W.textNodeName];else if(Object.keys(X).length===0)if(W.alwaysCreateTextNode)X[W.textNodeName]="";else X="";if(F[w0]!==void 0&&typeof X==="object"&&X!==null)X[w0]=F[w0];if(G[U]!==void 0&&Object.prototype.hasOwnProperty.call(G,U)){if(!Array.isArray(G[U]))G[U]=[G[U]];G[U].push(X)}else{let $=W.jPath?Y.toString():Y;if(W.isArray(U,$,K))G[U]=[X];else G[U]=X}if(U!==void 0&&U!==W.textNodeName)Q.pop()}}if(typeof z==="string"){if(z.length>0)G[W.textNodeName]=z}else if(z!==void 0)G[W.textNodeName]=z;return G}function eQ(J){let W=Object.keys(J);for(let Q=0;Q<W.length;Q++){let Y=W[Q];if(Y!==":@")return Y}}function JW(J,W,Q,Y){if(W){let z=Object.keys(W),G=z.length;for(let Z=0;Z<G;Z++){let F=z[Z],U=F.startsWith(Y.attributeNamePrefix)?F.substring(Y.attributeNamePrefix.length):F,X=Y.jPath?Q.toString()+"."+U:Q;if(Y.isArray(F,X,!0,!0))J[F]=[W[F]];else J[F]=W[F]}}}function QW(J,W){let{textNodeName:Q}=W,Y=Object.keys(J).length;if(Y===0)return!0;if(Y===1&&(J[Q]||typeof J[Q]==="boolean"||J[Q]===0))return!0;return!1}class l6{constructor(J){this.externalEntities={},this.options=aJ(J)}parse(J,W){if(typeof J!=="string"&&J.toString)J=J.toString();else if(typeof J!=="string")throw Error("XML data is accepted in String or Bytes[] form.");if(W){if(W===!0)W={};let z=P8(J,W);if(z!==!0)throw Error(`${z.err.msg}:${z.err.line}:${z.err.col}`)}let Q=new N8(this.options,this.externalEntities),Y=Q.parseXml(J);if(this.options.preserveOrder||Y===void 0)return Y;else return N0(Y,this.options,Q.matcher,Q.readonlyMatcher)}addEntity(J,W){if(W.indexOf("&")!==-1)throw Error("Entity value can't have '&'");else if(J.indexOf("&")!==-1||J.indexOf(";")!==-1)throw Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");else if(W==="&")throw Error("An entity with value '&' is not permitted");else this.externalEntities[J]=W}static getMetaDataSymbol(){return X5.getMetaDataSymbol()}}function i6(J){return String(J).replace(/--/g,"- -").replace(/--/g,"- -").replace(/-$/,"- ")}function D8(J){return String(J).replace(/\]\]>/g,"]]]]><![CDATA[>")}function R5(J){return String(J).replace(/"/g,"&quot;").replace(/'/g,"&apos;")}var WW=`
`;function YW(J,W){if(!Array.isArray(J)||J.length===0)return"1.0";let Q=J[0];if(S0(Q)==="?xml"){let z=Q[":@"];if(z){let G=W.attributeNamePrefix+"version";if(z[G])return z[G]}}return"1.0"}function F7(J,W,Q,Y,z){if(!Q.sanitizeName)return J;if(z(J))return J;return Q.sanitizeName(J,{isAttribute:W,matcher:Y.readOnly()})}function k0(J,W){let Q="";if(W.format)Q=WW;let Y=[];if(W.stopNodes&&Array.isArray(W.stopNodes))for(let F=0;F<W.stopNodes.length;F++){let U=W.stopNodes[F];if(typeof U==="string")Y.push(new B5(U));else if(U instanceof B5)Y.push(U)}let z=YW(J,W),G=A8("qName",{xmlVersion:z}),Z=new y5;return H7(J,W,Q,Z,Y,G)}function H7(J,W,Q,Y,z,G){let Z="",F=!1;if(W.maxNestedTags&&Y.getDepth()>W.maxNestedTags)throw Error("Maximum nested tags exceeded");if(!Array.isArray(J)){if(J!==void 0&&J!==null){let U=J.toString();return U=D0(U,W),U}return""}for(let U=0;U<J.length;U++){let X=J[U],K=S0(X);if(K===void 0)continue;let H=K===W.textNodeName||K===W.cdataPropName||K===W.commentPropName||K[0]==="?"?K:F7(K,!1,W,Y,G),q=GW(X[":@"],W);Y.push(H,q);let V=UW(Y,z);if(H===W.textNodeName){let P=X[K];if(!V)P=W.tagValueProcessor(H,P),P=D0(P,W);if(F)Z+=Q;Z+=P,F=!1,Y.pop();continue}else if(H===W.cdataPropName){if(F)Z+=Q;let P=X[K][0][W.textNodeName],M=D8(P);Z+=`<![CDATA[${M}]]>`,F=!1,Y.pop();continue}else if(H===W.commentPropName){let P=X[K][0][W.textNodeName],M=i6(P);Z+=Q+`<!--${M}-->`,F=!0,Y.pop();continue}else if(H[0]==="?"){let P=X7(X[":@"],W,V,Y,G);Z+=(H==="?xml"?"":Q)+`<${H}${P}?>`,F=!0,Y.pop();continue}let L=Q;if(L!=="")L+=W.indentBy;let B=X7(X[":@"],W,V,Y,G),O=Q+`<${H}${B}`,j;if(V)j=$7(X[K],W);else j=H7(X[K],W,L,Y,z,G);if(W.unpairedTags.indexOf(H)!==-1)if(W.suppressUnpairedNode)Z+=O+">";else Z+=O+"/>";else if((!j||j.length===0)&&W.suppressEmptyNode)Z+=O+"/>";else if(j&&j.endsWith(">"))Z+=O+`>${j}${Q}</${H}>`;else{if(Z+=O+">",j&&Q!==""&&(j.includes("/>")||j.includes("</")))Z+=Q+W.indentBy+j+Q;else Z+=j;Z+=`</${H}>`}F=!0,Y.pop()}return Z}function GW(J,W){if(!J||W.ignoreAttributes)return null;let Q={},Y=!1;for(let z in J){if(!Object.prototype.hasOwnProperty.call(J,z))continue;let G=z.startsWith(W.attributeNamePrefix)?z.substr(W.attributeNamePrefix.length):z;Q[G]=R5(J[z]),Y=!0}return Y?Q:null}function $7(J,W){if(!Array.isArray(J)){if(J!==void 0&&J!==null)return J.toString();return""}let Q="";for(let Y=0;Y<J.length;Y++){let z=J[Y],G=S0(z);if(G===W.textNodeName)Q+=z[G];else if(G===W.cdataPropName)Q+=z[G][0][W.textNodeName];else if(G===W.commentPropName)Q+=z[G][0][W.textNodeName];else if(G&&G[0]==="?")continue;else if(G){let Z=zW(z[":@"],W),F=$7(z[G],W);if(!F||F.length===0)Q+=`<${G}${Z}/>`;else Q+=`<${G}${Z}>${F}</${G}>`}}return Q}function zW(J,W){let Q="";if(J&&!W.ignoreAttributes)for(let Y in J){if(!Object.prototype.hasOwnProperty.call(J,Y))continue;let z=J[Y];if(z===!0&&W.suppressBooleanAttributes)Q+=` ${Y.substr(W.attributeNamePrefix.length)}`;else Q+=` ${Y.substr(W.attributeNamePrefix.length)}="${R5(z)}"`}return Q}function S0(J){let W=Object.keys(J);for(let Q=0;Q<W.length;Q++){let Y=W[Q];if(!Object.prototype.hasOwnProperty.call(J,Y))continue;if(Y!==":@")return Y}}function X7(J,W,Q,Y,z){let G="";if(J&&!W.ignoreAttributes)for(let Z in J){if(!Object.prototype.hasOwnProperty.call(J,Z))continue;let F=Z.substr(W.attributeNamePrefix.length),U=Q?F:F7(F,!0,W,Y,z),X;if(Q)X=J[Z];else X=W.attributeValueProcessor(Z,J[Z]),X=D0(X,W);if(X===!0&&W.suppressBooleanAttributes)G+=` ${U}`;else G+=` ${U}="${R5(X)}"`}return G}function UW(J,W){if(!W||W.length===0)return!1;for(let Q=0;Q<W.length;Q++)if(J.matches(W[Q]))return!0;return!1}function D0(J,W){if(J&&J.length>0&&W.processEntities)for(let Q=0;Q<W.entities.length;Q++){let Y=W.entities[Q];J=J.replace(Y.regex,Y.val)}return J}function I0(J){if(typeof J==="function")return J;if(Array.isArray(J))return(W)=>{for(let Q of J){if(typeof Q==="string"&&W===Q)return!0;if(Q instanceof RegExp&&Q.test(W))return!0}};return()=>!1}var ZW={attributeNamePrefix:"@_",attributesGroupName:!1,textNodeName:"#text",ignoreAttributes:!0,cdataPropName:!1,format:!1,indentBy:"  ",suppressEmptyNode:!1,suppressUnpairedNode:!0,suppressBooleanAttributes:!0,tagValueProcessor:function(J,W){return W},attributeValueProcessor:function(J,W){return W},preserveOrder:!1,commentPropName:!1,unpairedTags:[],entities:[{regex:new RegExp("&","g"),val:"&amp;"},{regex:new RegExp(">","g"),val:"&gt;"},{regex:new RegExp("<","g"),val:"&lt;"},{regex:new RegExp("'","g"),val:"&apos;"},{regex:new RegExp('"',"g"),val:"&quot;"}],processEntities:!0,stopNodes:[],oneListGroup:!1,maxNestedTags:100,jPath:!0,sanitizeName:!1};function G5(J){if(this.options=Object.assign({},ZW,J),this.options.stopNodes&&Array.isArray(this.options.stopNodes))this.options.stopNodes=this.options.stopNodes.map((W)=>{if(typeof W==="string"&&W.startsWith("*."))return"."+"."+W.substring(2);return W});if(this.stopNodeExpressions=[],this.options.stopNodes&&Array.isArray(this.options.stopNodes))for(let W=0;W<this.options.stopNodes.length;W++){let Q=this.options.stopNodes[W];if(typeof Q==="string")this.stopNodeExpressions.push(new B5(Q));else if(Q instanceof B5)this.stopNodeExpressions.push(Q)}if(this.options.ignoreAttributes===!0||this.options.attributesGroupName)this.isAttribute=function(){return!1};else this.ignoreAttributesFn=I0(this.options.ignoreAttributes),this.attrPrefixLen=this.options.attributeNamePrefix.length,this.isAttribute=HW;if(this.processTextOrObjNode=XW,this.options.format)this.indentate=FW,this.tagEndChar=`>
`,this.newLine=`
`;else this.indentate=function(){return""},this.tagEndChar=">",this.newLine=""}function KW(J,W){let Q=J["?xml"];if(Q&&typeof Q==="object"){if(W.attributesGroupName&&Q[W.attributesGroupName]){let z=Q[W.attributesGroupName][W.attributeNamePrefix+"version"];if(z)return z}let Y=Q[W.attributeNamePrefix+"version"];if(Y)return Y}return"1.0"}function y0(J,W,Q,Y,z){if(!Q.sanitizeName)return J;if(z(J))return J;return Q.sanitizeName(J,{isAttribute:W,matcher:Y.readOnly()})}G5.prototype.build=function(J){if(this.options.preserveOrder)return k0(J,this.options);else{if(Array.isArray(J)&&this.options.arrayNodeName&&this.options.arrayNodeName.length>1)J={[this.options.arrayNodeName]:J};let W=new y5,Q=KW(J,this.options),Y=A8("qName",{xmlVersion:Q});return this.j2x(J,0,W,Y).val}};G5.prototype.j2x=function(J,W,Q,Y){let z="",G="";if(this.options.maxNestedTags&&Q.getDepth()>=this.options.maxNestedTags)throw Error("Maximum nested tags exceeded");let Z=this.options.jPath?Q.toString():Q,F=this.checkStopNode(Q);for(let U in J){if(!Object.prototype.hasOwnProperty.call(J,U))continue;let K=U===this.options.textNodeName||U===this.options.cdataPropName||U===this.options.commentPropName||this.options.attributesGroupName&&U===this.options.attributesGroupName||this.isAttribute(U)||U[0]==="?"?U:y0(U,!1,this.options,Q,Y);if(typeof J[U]>"u"){if(this.isAttribute(U))G+=""}else if(J[U]===null)if(this.isAttribute(U))G+="";else if(K===this.options.cdataPropName||K===this.options.commentPropName)G+="";else if(K[0]==="?")G+=this.indentate(W)+"<"+K+"?"+this.tagEndChar;else G+=this.indentate(W)+"<"+K+"/"+this.tagEndChar;else if(J[U]instanceof Date)G+=this.buildTextValNode(J[U],K,"",W,Q);else if(typeof J[U]!=="object"){let $=this.isAttribute(U);if($&&!this.ignoreAttributesFn($,Z)){let H=y0($,!0,this.options,Q,Y);z+=this.buildAttrPairStr(H,""+J[U],F)}else if(!$)if(U===this.options.textNodeName){let H=this.options.tagValueProcessor(U,""+J[U]);G+=this.replaceEntitiesValue(H)}else{Q.push(K);let H=this.checkStopNode(Q);if(Q.pop(),H){let q=""+J[U];if(q==="")G+=this.indentate(W)+"<"+K+this.closeTag(K)+this.tagEndChar;else G+=this.indentate(W)+"<"+K+">"+q+"</"+K+this.tagEndChar}else G+=this.buildTextValNode(J[U],K,"",W,Q)}}else if(Array.isArray(J[U])){let $=J[U].length,H="",q="";for(let V=0;V<$;V++){let L=J[U][V];if(typeof L>"u");else if(L===null)if(K[0]==="?")G+=this.indentate(W)+"<"+K+"?"+this.tagEndChar;else G+=this.indentate(W)+"<"+K+"/"+this.tagEndChar;else if(typeof L==="object")if(this.options.oneListGroup){Q.push(K);let B=this.j2x(L,W+1,Q,Y);if(Q.pop(),H+=B.val,this.options.attributesGroupName&&L.hasOwnProperty(this.options.attributesGroupName))q+=B.attrStr}else H+=this.processTextOrObjNode(L,K,W,Q,Y);else if(this.options.oneListGroup){let B=this.options.tagValueProcessor(K,L);B=this.replaceEntitiesValue(B),H+=B}else{Q.push(K);let B=this.checkStopNode(Q);if(Q.pop(),B){let O=""+L;if(O==="")H+=this.indentate(W)+"<"+K+this.closeTag(K)+this.tagEndChar;else H+=this.indentate(W)+"<"+K+">"+O+"</"+K+this.tagEndChar}else H+=this.buildTextValNode(L,K,"",W,Q)}}if(this.options.oneListGroup)H=this.buildObjectNode(H,K,q,W);G+=H}else if(this.options.attributesGroupName&&U===this.options.attributesGroupName){let $=Object.keys(J[U]),H=$.length;for(let q=0;q<H;q++){let V=y0($[q],!0,this.options,Q,Y);z+=this.buildAttrPairStr(V,""+J[U][$[q]],F)}}else G+=this.processTextOrObjNode(J[U],K,W,Q,Y)}return{attrStr:z,val:G}};G5.prototype.buildAttrPairStr=function(J,W,Q){if(!Q)W=this.options.attributeValueProcessor(J,""+W),W=this.replaceEntitiesValue(W);if(this.options.suppressBooleanAttributes&&W==="true")return" "+J;else return" "+J+'="'+R5(W)+'"'};function XW(J,W,Q,Y,z){let G=this.extractAttributes(J);if(Y.push(W,G),this.checkStopNode(Y)){let U=this.buildRawContent(J),X=this.buildAttributesForStopNode(J);return Y.pop(),this.buildObjectNode(U,W,X,Q)}let F=this.j2x(J,Q+1,Y,z);if(Y.pop(),W[0]==="?")return this.buildTextValNode("",W,F.attrStr,Q,Y);else if(J[this.options.textNodeName]!==void 0&&Object.keys(J).length===1)return this.buildTextValNode(J[this.options.textNodeName],W,F.attrStr,Q,Y);else return this.buildObjectNode(F.val,W,F.attrStr,Q)}G5.prototype.extractAttributes=function(J){if(!J||typeof J!=="object")return null;let W={},Q=!1;if(this.options.attributesGroupName&&J[this.options.attributesGroupName]){let Y=J[this.options.attributesGroupName];for(let z in Y){if(!Object.prototype.hasOwnProperty.call(Y,z))continue;let G=z.startsWith(this.options.attributeNamePrefix)?z.substring(this.options.attributeNamePrefix.length):z;W[G]=R5(Y[z]),Q=!0}}else for(let Y in J){if(!Object.prototype.hasOwnProperty.call(J,Y))continue;let z=this.isAttribute(Y);if(z)W[z]=R5(J[Y]),Q=!0}return Q?W:null};G5.prototype.buildRawContent=function(J){if(typeof J==="string")return J;if(typeof J!=="object"||J===null)return String(J);if(J[this.options.textNodeName]!==void 0)return J[this.options.textNodeName];let W="";for(let Q in J){if(!Object.prototype.hasOwnProperty.call(J,Q))continue;if(this.isAttribute(Q))continue;if(this.options.attributesGroupName&&Q===this.options.attributesGroupName)continue;let Y=J[Q];if(Q===this.options.textNodeName)W+=Y;else if(Array.isArray(Y)){for(let z of Y)if(typeof z==="string"||typeof z==="number")W+=`<${Q}>${z}</${Q}>`;else if(typeof z==="object"&&z!==null){let G=this.buildRawContent(z),Z=this.buildAttributesForStopNode(z);if(G==="")W+=`<${Q}${Z}/>`;else W+=`<${Q}${Z}>${G}</${Q}>`}}else if(typeof Y==="object"&&Y!==null){let z=this.buildRawContent(Y),G=this.buildAttributesForStopNode(Y);if(z==="")W+=`<${Q}${G}/>`;else W+=`<${Q}${G}>${z}</${Q}>`}else W+=`<${Q}>${Y}</${Q}>`}return W};G5.prototype.buildAttributesForStopNode=function(J){if(!J||typeof J!=="object")return"";let W="";if(this.options.attributesGroupName&&J[this.options.attributesGroupName]){let Q=J[this.options.attributesGroupName];for(let Y in Q){if(!Object.prototype.hasOwnProperty.call(Q,Y))continue;let z=Y.startsWith(this.options.attributeNamePrefix)?Y.substring(this.options.attributeNamePrefix.length):Y,G=Q[Y];if(G===!0&&this.options.suppressBooleanAttributes)W+=" "+z;else W+=" "+z+'="'+R5(G)+'"'}}else for(let Q in J){if(!Object.prototype.hasOwnProperty.call(J,Q))continue;let Y=this.isAttribute(Q);if(Y){let z=J[Q];if(z===!0&&this.options.suppressBooleanAttributes)W+=" "+Y;else W+=" "+Y+'="'+R5(z)+'"'}}return W};G5.prototype.buildObjectNode=function(J,W,Q,Y){if(J==="")if(W[0]==="?")return this.indentate(Y)+"<"+W+Q+"?"+this.tagEndChar;else return this.indentate(Y)+"<"+W+Q+this.closeTag(W)+this.tagEndChar;else if(W[0]==="?")return this.indentate(Y)+"<"+W+Q+"?"+this.tagEndChar;else{let z="</"+W+this.tagEndChar,G="";if(W[0]==="?")G="?",z="";if((Q||Q==="")&&J.indexOf("<")===-1)return this.indentate(Y)+"<"+W+Q+G+">"+J+z;else if(this.options.commentPropName!==!1&&W===this.options.commentPropName&&G.length===0)return this.indentate(Y)+`<!--${i6(J)}-->`+this.newLine;else return this.indentate(Y)+"<"+W+Q+G+this.tagEndChar+J+this.indentate(Y)+z}};G5.prototype.closeTag=function(J){let W="";if(this.options.unpairedTags.indexOf(J)!==-1){if(!this.options.suppressUnpairedNode)W="/"}else if(this.options.suppressEmptyNode)W="/";else W=`></${J}`;return W};G5.prototype.checkStopNode=function(J){if(!this.stopNodeExpressions||this.stopNodeExpressions.length===0)return!1;for(let W=0;W<this.stopNodeExpressions.length;W++)if(J.matches(this.stopNodeExpressions[W]))return!0;return!1};G5.prototype.buildTextValNode=function(J,W,Q,Y,z){if(this.options.cdataPropName!==!1&&W===this.options.cdataPropName){let G=D8(J);return this.indentate(Y)+`<![CDATA[${G}]]>`+this.newLine}else if(this.options.commentPropName!==!1&&W===this.options.commentPropName){let G=i6(J);return this.indentate(Y)+`<!--${G}-->`+this.newLine}else if(W[0]==="?")return this.indentate(Y)+"<"+W+Q+"?"+this.tagEndChar;else{let G=this.options.tagValueProcessor(W,J);if(G=this.replaceEntitiesValue(G),G==="")return this.indentate(Y)+"<"+W+Q+this.closeTag(W)+this.tagEndChar;else return this.indentate(Y)+"<"+W+Q+">"+G+"</"+W+this.tagEndChar}};G5.prototype.replaceEntitiesValue=function(J){if(J&&J.length>0&&this.options.processEntities)for(let W=0;W<this.options.entities.length;W++){let Q=this.options.entities[W];J=J.replace(Q.regex,Q.val)}return J};function FW(J){return this.options.indentBy.repeat(J)}function HW(J){if(J.startsWith(this.options.attributeNamePrefix)&&J!==this.options.textNodeName)return J.substr(this.attrPrefixLen);else return!1}var b0=G5;var k8={validate:P8};/*! pako 2.2.0 https://github.com/nodeca/pako @license (MIT AND Zlib) */function R6(J){let W=J.length;while(--W>=0)J[W]=0}var $W=0,e7=1,qW=2,VW=3,LW=258,YJ=29,U8=256,e6=U8+1+YJ,P6=30,GJ=19,J9=2*e6+1,s5=15,f0=16,BW=7,zJ=256,Q9=16,W9=17,Y9=18,r0=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),v8=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),jW=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),G9=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),MW=512,f5=Array((e6+2)*2);R6(f5);var a6=Array(P6*2);R6(a6);var J8=Array(MW);R6(J8);var Q8=Array(LW-VW+1);R6(Q8);var UJ=Array(YJ);R6(UJ);var _8=Array(P6);R6(_8);function v0(J,W,Q,Y,z){this.static_tree=J,this.extra_bits=W,this.extra_base=Q,this.elems=Y,this.max_length=z,this.has_stree=J&&J.length}var z9,U9,Z9;function _0(J,W){this.dyn_tree=J,this.max_code=0,this.stat_desc=W}var K9=(J)=>{return J<256?J8[J]:J8[256+(J>>>7)]},W8=(J,W)=>{J.pending_buf[J.pending++]=W&255,J.pending_buf[J.pending++]=W>>>8&255},z5=(J,W,Q)=>{if(J.bi_valid>f0-Q)J.bi_buf|=W<<J.bi_valid&65535,W8(J,J.bi_buf),J.bi_buf=W>>f0-J.bi_valid,J.bi_valid+=Q-f0;else J.bi_buf|=W<<J.bi_valid&65535,J.bi_valid+=Q},w5=(J,W,Q)=>{z5(J,Q[W*2],Q[W*2+1])},X9=(J,W)=>{let Q=0;do Q|=J&1,J>>>=1,Q<<=1;while(--W>0);return Q>>>1},PW=(J)=>{if(J.bi_valid===16)W8(J,J.bi_buf),J.bi_buf=0,J.bi_valid=0;else if(J.bi_valid>=8)J.pending_buf[J.pending++]=J.bi_buf&255,J.bi_buf>>=8,J.bi_valid-=8},OW=(J,W)=>{let{dyn_tree:Q,max_code:Y}=W,z=W.stat_desc.static_tree,G=W.stat_desc.has_stree,Z=W.stat_desc.extra_bits,F=W.stat_desc.extra_base,U=W.stat_desc.max_length,X,K,$,H,q,V,L=0;for(H=0;H<=s5;H++)J.bl_count[H]=0;Q[J.heap[J.heap_max]*2+1]=0;for(X=J.heap_max+1;X<J9;X++){if(K=J.heap[X],H=Q[Q[K*2+1]*2+1]+1,H>U)H=U,L++;if(Q[K*2+1]=H,K>Y)continue;if(J.bl_count[H]++,q=0,K>=F)q=Z[K-F];if(V=Q[K*2],J.opt_len+=V*(H+q),G)J.static_len+=V*(z[K*2+1]+q)}if(L===0)return;do{H=U-1;while(J.bl_count[H]===0)H--;J.bl_count[H]--,J.bl_count[H+1]+=2,J.bl_count[U]--,L-=2}while(L>0);for(H=U;H!==0;H--){K=J.bl_count[H];while(K!==0){if($=J.heap[--X],$>Y)continue;if(Q[$*2+1]!==H)J.opt_len+=(H-Q[$*2+1])*Q[$*2],Q[$*2+1]=H;K--}}},F9=(J,W,Q)=>{let Y=Array(s5+1),z=0,G,Z;for(G=1;G<=s5;G++)z=z+Q[G-1]<<1,Y[G]=z;for(Z=0;Z<=W;Z++){let F=J[Z*2+1];if(F===0)continue;J[Z*2]=X9(Y[F]++,F)}},CW=()=>{let J,W,Q,Y,z,G=Array(s5+1);Q=0;for(Y=0;Y<YJ-1;Y++){UJ[Y]=Q;for(J=0;J<1<<r0[Y];J++)Q8[Q++]=Y}Q8[Q-1]=Y,z=0;for(Y=0;Y<16;Y++){_8[Y]=z;for(J=0;J<1<<v8[Y];J++)J8[z++]=Y}z>>=7;for(;Y<P6;Y++){_8[Y]=z<<7;for(J=0;J<1<<v8[Y]-7;J++)J8[256+z++]=Y}for(W=0;W<=s5;W++)G[W]=0;J=0;while(J<=143)f5[J*2+1]=8,J++,G[8]++;while(J<=255)f5[J*2+1]=9,J++,G[9]++;while(J<=279)f5[J*2+1]=7,J++,G[7]++;while(J<=287)f5[J*2+1]=8,J++,G[8]++;F9(f5,e6+1,G);for(J=0;J<P6;J++)a6[J*2+1]=5,a6[J*2]=X9(J,5);z9=new v0(f5,r0,U8+1,e6,s5),U9=new v0(a6,v8,0,P6,s5),Z9=new v0([],jW,0,GJ,BW)},H9=(J)=>{let W;for(W=0;W<e6;W++)J.dyn_ltree[W*2]=0;for(W=0;W<P6;W++)J.dyn_dtree[W*2]=0;for(W=0;W<GJ;W++)J.bl_tree[W*2]=0;J.dyn_ltree[zJ*2]=1,J.opt_len=J.static_len=0,J.sym_next=J.matches=0},$9=(J)=>{if(J.bi_valid>8)W8(J,J.bi_buf);else if(J.bi_valid>0)J.pending_buf[J.pending++]=J.bi_buf;J.bi_buf=0,J.bi_valid=0},q7=(J,W,Q,Y)=>{let z=W*2,G=Q*2;return J[z]<J[G]||J[z]===J[G]&&Y[W]<=Y[Q]},x0=(J,W,Q)=>{let Y=J.heap[Q],z=Q<<1;while(z<=J.heap_len){if(z<J.heap_len&&q7(W,J.heap[z+1],J.heap[z],J.depth))z++;if(q7(W,Y,J.heap[z],J.depth))break;J.heap[Q]=J.heap[z],Q=z,z<<=1}J.heap[Q]=Y},V7=(J,W,Q)=>{let Y,z,G=0,Z,F;if(J.sym_next!==0)do if(Y=J.pending_buf[J.sym_buf+G++]&255,Y+=(J.pending_buf[J.sym_buf+G++]&255)<<8,z=J.pending_buf[J.sym_buf+G++],Y===0)w5(J,z,W);else{if(Z=Q8[z],w5(J,Z+U8+1,W),F=r0[Z],F!==0)z-=UJ[Z],z5(J,z,F);if(Y--,Z=K9(Y),w5(J,Z,Q),F=v8[Z],F!==0)Y-=_8[Z],z5(J,Y,F)}while(G<J.sym_next);w5(J,zJ,W)},o0=(J,W)=>{let Q=W.dyn_tree,Y=W.stat_desc.static_tree,z=W.stat_desc.has_stree,G=W.stat_desc.elems,Z,F,U=-1,X;J.heap_len=0,J.heap_max=J9;for(Z=0;Z<G;Z++)if(Q[Z*2]!==0)J.heap[++J.heap_len]=U=Z,J.depth[Z]=0;else Q[Z*2+1]=0;while(J.heap_len<2)if(X=J.heap[++J.heap_len]=U<2?++U:0,Q[X*2]=1,J.depth[X]=0,J.opt_len--,z)J.static_len-=Y[X*2+1];W.max_code=U;for(Z=J.heap_len>>1;Z>=1;Z--)x0(J,Q,Z);X=G;do Z=J.heap[1],J.heap[1]=J.heap[J.heap_len--],x0(J,Q,1),F=J.heap[1],J.heap[--J.heap_max]=Z,J.heap[--J.heap_max]=F,Q[X*2]=Q[Z*2]+Q[F*2],J.depth[X]=(J.depth[Z]>=J.depth[F]?J.depth[Z]:J.depth[F])+1,Q[Z*2+1]=Q[F*2+1]=X,J.heap[1]=X++,x0(J,Q,1);while(J.heap_len>=2);J.heap[--J.heap_max]=J.heap[1],OW(J,W),F9(Q,U,J.bl_count)},L7=(J,W,Q)=>{let Y,z=-1,G,Z=W[1],F=0,U=7,X=4;if(Z===0)U=138,X=3;W[(Q+1)*2+1]=65535;for(Y=0;Y<=Q;Y++){if(G=Z,Z=W[(Y+1)*2+1],++F<U&&G===Z)continue;else if(F<X)J.bl_tree[G*2]+=F;else if(G!==0){if(G!==z)J.bl_tree[G*2]++;J.bl_tree[Q9*2]++}else if(F<=10)J.bl_tree[W9*2]++;else J.bl_tree[Y9*2]++;if(F=0,z=G,Z===0)U=138,X=3;else if(G===Z)U=6,X=3;else U=7,X=4}},B7=(J,W,Q)=>{let Y,z=-1,G,Z=W[1],F=0,U=7,X=4;if(Z===0)U=138,X=3;for(Y=0;Y<=Q;Y++){if(G=Z,Z=W[(Y+1)*2+1],++F<U&&G===Z)continue;else if(F<X)do w5(J,G,J.bl_tree);while(--F!==0);else if(G!==0){if(G!==z)w5(J,G,J.bl_tree),F--;w5(J,Q9,J.bl_tree),z5(J,F-3,2)}else if(F<=10)w5(J,W9,J.bl_tree),z5(J,F-3,3);else w5(J,Y9,J.bl_tree),z5(J,F-11,7);if(F=0,z=G,Z===0)U=138,X=3;else if(G===Z)U=6,X=3;else U=7,X=4}},AW=(J)=>{let W;L7(J,J.dyn_ltree,J.l_desc.max_code),L7(J,J.dyn_dtree,J.d_desc.max_code),o0(J,J.bl_desc);for(W=GJ-1;W>=3;W--)if(J.bl_tree[G9[W]*2+1]!==0)break;return J.opt_len+=3*(W+1)+5+5+4,W},RW=(J,W,Q,Y)=>{let z;z5(J,W-257,5),z5(J,Q-1,5),z5(J,Y-4,4);for(z=0;z<Y;z++)z5(J,J.bl_tree[G9[z]*2+1],3);B7(J,J.dyn_ltree,W-1),B7(J,J.dyn_dtree,Q-1)},TW=(J)=>{let W=4093624447,Q;for(Q=0;Q<=31;Q++,W>>>=1)if(W&1&&J.dyn_ltree[Q*2]!==0)return 0;if(J.dyn_ltree[18]!==0||J.dyn_ltree[20]!==0||J.dyn_ltree[26]!==0)return 1;for(Q=32;Q<U8;Q++)if(J.dyn_ltree[Q*2]!==0)return 1;return 0},j7=!1,EW=(J)=>{if(!j7)CW(),j7=!0;J.l_desc=new _0(J.dyn_ltree,z9),J.d_desc=new _0(J.dyn_dtree,U9),J.bl_desc=new _0(J.bl_tree,Z9),J.bi_buf=0,J.bi_valid=0,H9(J)},q9=(J,W,Q,Y)=>{if(z5(J,($W<<1)+(Y?1:0),3),$9(J),W8(J,Q),W8(J,~Q),Q)J.pending_buf.set(J.window.subarray(W,W+Q),J.pending);J.pending+=Q},wW=(J)=>{z5(J,e7<<1,3),w5(J,zJ,f5),PW(J)},NW=(J,W,Q,Y)=>{let z,G,Z=0;if(J.level>0){if(J.strm.data_type===2)J.strm.data_type=TW(J);if(o0(J,J.l_desc),o0(J,J.d_desc),Z=AW(J),z=J.opt_len+3+7>>>3,G=J.static_len+3+7>>>3,G<=z)z=G}else z=G=Q+5;if(Q+4<=z&&W!==-1)q9(J,W,Q,Y);else if(J.strategy===4||G===z)z5(J,(e7<<1)+(Y?1:0),3),V7(J,f5,a6);else z5(J,(qW<<1)+(Y?1:0),3),RW(J,J.l_desc.max_code+1,J.d_desc.max_code+1,Z+1),V7(J,J.dyn_ltree,J.dyn_dtree);if(H9(J),Y)$9(J)},DW=(J,W,Q)=>{if(J.pending_buf[J.sym_buf+J.sym_next++]=W,J.pending_buf[J.sym_buf+J.sym_next++]=W>>8,J.pending_buf[J.sym_buf+J.sym_next++]=Q,W===0)J.dyn_ltree[Q*2]++;else J.matches++,W--,J.dyn_ltree[(Q8[Q]+U8+1)*2]++,J.dyn_dtree[K9(W)*2]++;return J.sym_next===J.sym_end},kW=EW,SW=q9,IW=NW,yW=DW,bW=wW,fW={_tr_init:kW,_tr_stored_block:SW,_tr_flush_block:IW,_tr_tally:yW,_tr_align:bW},vW=(J,W,Q,Y)=>{let z=J&65535|0,G=J>>>16&65535|0,Z=0;while(Q!==0){Z=Q>2000?2000:Q,Q-=Z;do z=z+W[Y++]|0,G=G+z|0;while(--Z);z%=65521,G%=65521}return z|G<<16|0},Y8=vW,_W=()=>{let J,W=[];for(var Q=0;Q<256;Q++){J=Q;for(var Y=0;Y<8;Y++)J=J&1?3988292384^J>>>1:J>>>1;W[Q]=J}return W},xW=new Uint32Array(_W()),hW=(J,W,Q,Y)=>{let z=xW,G=Y+Q;J^=-1;for(let Z=Y;Z<G;Z++)J=J>>>8^z[(J^W[Z])&255];return J^-1},r=hW,J6={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},G6={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8},{_tr_init:uW,_tr_stored_block:a0,_tr_flush_block:gW,_tr_tally:g5,_tr_align:cW}=fW,{Z_NO_FLUSH:c5,Z_PARTIAL_FLUSH:mW,Z_FULL_FLUSH:pW,Z_FINISH:j5,Z_BLOCK:M7,Z_OK:a,Z_STREAM_END:P7,Z_STREAM_ERROR:N5,Z_DATA_ERROR:dW,Z_BUF_ERROR:h0,Z_DEFAULT_COMPRESSION:lW,Z_FILTERED:iW,Z_HUFFMAN_ONLY:S8,Z_RLE:nW,Z_FIXED:rW,Z_DEFAULT_STRATEGY:oW,Z_UNKNOWN:aW,Z_DEFLATED:u8}=G6,sW=9,tW=15,eW=8,J4=29,Q4=256,s0=Q4+1+J4,W4=30,Y4=19,G4=2*s0+1,z4=15,v=3,u5=258,D5=u5+v+1,U4=32,C6=42,ZJ=57,t0=69,e0=73,JJ=91,QJ=103,t5=113,r6=666,Q5=1,T6=2,Q6=3,E6=4,Z4=3,e5=(J,W)=>{return J.msg=J6[W],W},O7=(J)=>{return J*2-(J>4?9:0)},h5=(J)=>{let W=J.length;while(--W>=0)J[W]=0},K4=(J)=>{let W,Q,Y,z=J.w_size;W=J.hash_size,Y=W;do Q=J.head[--Y],J.head[Y]=Q>=z?Q-z:0;while(--W);W=z,Y=W;do Q=J.prev[--Y],J.prev[Y]=Q>=z?Q-z:0;while(--W)},KJ=(J,W,Q)=>(W<<J.hash_shift^Q)&J.hash_mask,W6=(J,W)=>{let Q;if(J.legacy_hash)Q=J.ins_h=KJ(J,J.ins_h,J.window[W+v-1]);else{let z=J.window,G=z[W]|z[W+1]<<8|z[W+2]<<16|z[W+3]<<24;Q=J.ins_h=Math.imul(G,66521)+66521>>>16&J.hash_mask}let Y=J.prev[W&J.w_mask]=J.head[Q];return J.head[Q]=W,Y},F5=(J)=>{let W=J.state,Q=W.pending;if(Q>J.avail_out)Q=J.avail_out;if(Q===0)return;if(J.output.set(W.pending_buf.subarray(W.pending_out,W.pending_out+Q),J.next_out),J.next_out+=Q,W.pending_out+=Q,J.total_out+=Q,J.avail_out-=Q,W.pending-=Q,W.pending===0)W.pending_out=0},H5=(J,W)=>{gW(J,J.block_start>=0?J.block_start:-1,J.strstart-J.block_start,W),J.block_start=J.strstart,F5(J.strm)},x=(J,W)=>{J.pending_buf[J.pending++]=W},n6=(J,W)=>{J.pending_buf[J.pending++]=W>>>8&255,J.pending_buf[J.pending++]=W&255},WJ=(J,W,Q,Y)=>{let z=J.avail_in;if(z>Y)z=Y;if(z===0)return 0;if(J.avail_in-=z,W.set(J.input.subarray(J.next_in,J.next_in+z),Q),J.state.wrap===1)J.adler=Y8(J.adler,W,z,Q);else if(J.state.wrap===2)J.adler=r(J.adler,W,z,Q);return J.next_in+=z,J.total_in+=z,z},V9=(J,W)=>{let{max_chain_length:Q,strstart:Y}=J,z,G,Z=J.prev_length,F=J.nice_match,U=J.strstart>J.w_size-D5?J.strstart-(J.w_size-D5):0,X=J.window,K=J.w_mask,$=J.prev,H=J.strstart+u5,q=X[Y+Z-1],V=X[Y+Z];if(J.prev_length>=J.good_match)Q>>=2;if(F>J.lookahead)F=J.lookahead;do{if(z=W,X[z+Z]!==V||X[z+Z-1]!==q||X[z]!==X[Y]||X[++z]!==X[Y+1])continue;Y+=2,z++;do;while(X[++Y]===X[++z]&&X[++Y]===X[++z]&&X[++Y]===X[++z]&&X[++Y]===X[++z]&&X[++Y]===X[++z]&&X[++Y]===X[++z]&&X[++Y]===X[++z]&&X[++Y]===X[++z]&&Y<H);if(G=u5-(H-Y),Y=H-u5,G>Z){if(J.match_start=W,Z=G,G>=F)break;q=X[Y+Z-1],V=X[Y+Z]}}while((W=$[W&K])>U&&--Q!==0);if(Z<=J.lookahead)return Z;return J.lookahead},A6=(J)=>{let W=J.w_size,Q,Y,z;do{if(Y=J.window_size-J.lookahead-J.strstart,J.strstart>=W+(W-D5)){if(J.window.set(J.window.subarray(W,W+W-Y),0),J.match_start-=W,J.strstart-=W,J.block_start-=W,J.insert>J.strstart)J.insert=J.strstart;K4(J),Y+=W}if(J.strm.avail_in===0)break;if(Q=WJ(J.strm,J.window,J.strstart+J.lookahead,Y),J.lookahead+=Q,!J.legacy_hash){if(J.lookahead+J.insert>v){z=J.strstart-J.insert;while(J.insert)if(W6(J,z),z++,J.insert--,J.lookahead+J.insert<=v)break}}else if(J.lookahead+J.insert>=v){z=J.strstart-J.insert,J.ins_h=J.window[z],J.ins_h=KJ(J,J.ins_h,J.window[z+1]);while(J.insert)if(W6(J,z),z++,J.insert--,J.lookahead+J.insert<v)break}}while(J.lookahead<D5&&J.strm.avail_in!==0)},L9=(J,W)=>{let Q=J.pending_buf_size-5>J.w_size?J.w_size:J.pending_buf_size-5,Y,z,G,Z=0,F=J.strm.avail_in;do{if(Y=65535,G=J.bi_valid+42>>3,J.strm.avail_out<G)break;if(G=J.strm.avail_out-G,z=J.strstart-J.block_start,Y>z+J.strm.avail_in)Y=z+J.strm.avail_in;if(Y>G)Y=G;if(Y<Q&&(Y===0&&W!==j5||W===c5||Y!==z+J.strm.avail_in))break;if(Z=W===j5&&Y===z+J.strm.avail_in?1:0,a0(J,0,0,Z),J.pending_buf[J.pending-4]=Y,J.pending_buf[J.pending-3]=Y>>8,J.pending_buf[J.pending-2]=~Y,J.pending_buf[J.pending-1]=~Y>>8,F5(J.strm),z){if(z>Y)z=Y;J.strm.output.set(J.window.subarray(J.block_start,J.block_start+z),J.strm.next_out),J.strm.next_out+=z,J.strm.avail_out-=z,J.strm.total_out+=z,J.block_start+=z,Y-=z}if(Y)WJ(J.strm,J.strm.output,J.strm.next_out,Y),J.strm.next_out+=Y,J.strm.avail_out-=Y,J.strm.total_out+=Y}while(Z===0);if(F-=J.strm.avail_in,F){if(F>=J.w_size)J.matches=2,J.window.set(J.strm.input.subarray(J.strm.next_in-J.w_size,J.strm.next_in),0),J.strstart=J.w_size,J.insert=J.strstart;else{if(J.window_size-J.strstart<=F){if(J.strstart-=J.w_size,J.window.set(J.window.subarray(J.w_size,J.w_size+J.strstart),0),J.matches<2)J.matches++;if(J.insert>J.strstart)J.insert=J.strstart}J.window.set(J.strm.input.subarray(J.strm.next_in-F,J.strm.next_in),J.strstart),J.strstart+=F,J.insert+=F>J.w_size-J.insert?J.w_size-J.insert:F}J.block_start=J.strstart}if(J.high_water<J.strstart)J.high_water=J.strstart;if(Z)return E6;if(W!==c5&&W!==j5&&J.strm.avail_in===0&&J.strstart===J.block_start)return T6;if(G=J.window_size-J.strstart,J.strm.avail_in>G&&J.block_start>=J.w_size){if(J.block_start-=J.w_size,J.strstart-=J.w_size,J.window.set(J.window.subarray(J.w_size,J.w_size+J.strstart),0),J.matches<2)J.matches++;if(G+=J.w_size,J.insert>J.strstart)J.insert=J.strstart}if(G>J.strm.avail_in)G=J.strm.avail_in;if(G)WJ(J.strm,J.window,J.strstart,G),J.strstart+=G,J.insert+=G>J.w_size-J.insert?J.w_size-J.insert:G;if(J.high_water<J.strstart)J.high_water=J.strstart;if(G=J.bi_valid+42>>3,G=J.pending_buf_size-G>65535?65535:J.pending_buf_size-G,Q=G>J.w_size?J.w_size:G,z=J.strstart-J.block_start,z>=Q||(z||W===j5)&&W!==c5&&J.strm.avail_in===0&&z<=G)Y=z>G?G:z,Z=W===j5&&J.strm.avail_in===0&&Y===z?1:0,a0(J,J.block_start,Y,Z),J.block_start+=Y,F5(J.strm);return Z?Q6:Q5},u0=(J,W)=>{let Q,Y;for(;;){if(J.lookahead<D5){if(A6(J),J.lookahead<D5&&W===c5)return Q5;if(J.lookahead===0)break}if(Q=0,J.lookahead>=v)Q=W6(J,J.strstart);if(Q!==0&&J.strstart-Q<=J.w_size-D5)J.match_length=V9(J,Q);if(J.match_length>=v){if(Y=g5(J,J.strstart-J.match_start,J.match_length-v),J.lookahead-=J.match_length,J.match_length<=J.max_lazy_match&&J.lookahead>=v){J.match_length--;do J.strstart++,Q=W6(J,J.strstart);while(--J.match_length!==0);J.strstart++}else if(J.strstart+=J.match_length,J.match_length=0,J.legacy_hash)J.ins_h=J.window[J.strstart],J.ins_h=KJ(J,J.ins_h,J.window[J.strstart+1])}else Y=g5(J,0,J.window[J.strstart]),J.lookahead--,J.strstart++;if(Y){if(H5(J,!1),J.strm.avail_out===0)return Q5}}if(J.insert=J.strstart<v-1?J.strstart:v-1,W===j5){if(H5(J,!0),J.strm.avail_out===0)return Q6;return E6}if(J.sym_next){if(H5(J,!1),J.strm.avail_out===0)return Q5}return T6},j6=(J,W)=>{let Q,Y,z;for(;;){if(J.lookahead<D5){if(A6(J),J.lookahead<D5&&W===c5)return Q5;if(J.lookahead===0)break}if(Q=0,J.lookahead>=v)Q=W6(J,J.strstart);if(J.prev_length=J.match_length,J.prev_match=J.match_start,J.match_length=v-1,Q!==0&&J.prev_length<J.max_lazy_match&&J.strstart-Q<=J.w_size-D5){if(J.match_length=V9(J,Q),J.match_length<=5&&(J.strategy===iW||J.match_length===v&&J.strstart-J.match_start>4096))J.match_length=v-1}if(J.prev_length>=v&&J.match_length<=J.prev_length){z=J.strstart+J.lookahead-v,Y=g5(J,J.strstart-1-J.prev_match,J.prev_length-v),J.lookahead-=J.prev_length-1,J.prev_length-=2;do if(++J.strstart<=z)Q=W6(J,J.strstart);while(--J.prev_length!==0);if(J.match_available=0,J.match_length=v-1,J.strstart++,Y){if(H5(J,!1),J.strm.avail_out===0)return Q5}}else if(J.match_available){if(Y=g5(J,0,J.window[J.strstart-1]),Y)H5(J,!1);if(J.strstart++,J.lookahead--,J.strm.avail_out===0)return Q5}else J.match_available=1,J.strstart++,J.lookahead--}if(J.match_available)Y=g5(J,0,J.window[J.strstart-1]),J.match_available=0;if(J.insert=J.strstart<v-1?J.strstart:v-1,W===j5){if(H5(J,!0),J.strm.avail_out===0)return Q6;return E6}if(J.sym_next){if(H5(J,!1),J.strm.avail_out===0)return Q5}return T6},X4=(J,W)=>{let Q,Y,z,G,Z=J.window;for(;;){if(J.lookahead<=u5){if(A6(J),J.lookahead<=u5&&W===c5)return Q5;if(J.lookahead===0)break}if(J.match_length=0,J.lookahead>=v&&J.strstart>0){if(z=J.strstart-1,Y=Z[z],Y===Z[++z]&&Y===Z[++z]&&Y===Z[++z]){G=J.strstart+u5;do;while(Y===Z[++z]&&Y===Z[++z]&&Y===Z[++z]&&Y===Z[++z]&&Y===Z[++z]&&Y===Z[++z]&&Y===Z[++z]&&Y===Z[++z]&&z<G);if(J.match_length=u5-(G-z),J.match_length>J.lookahead)J.match_length=J.lookahead}}if(J.match_length>=v)Q=g5(J,1,J.match_length-v),J.lookahead-=J.match_length,J.strstart+=J.match_length,J.match_length=0;else Q=g5(J,0,J.window[J.strstart]),J.lookahead--,J.strstart++;if(Q){if(H5(J,!1),J.strm.avail_out===0)return Q5}}if(J.insert=0,W===j5){if(H5(J,!0),J.strm.avail_out===0)return Q6;return E6}if(J.sym_next){if(H5(J,!1),J.strm.avail_out===0)return Q5}return T6},F4=(J,W)=>{let Q;for(;;){if(J.lookahead===0){if(A6(J),J.lookahead===0){if(W===c5)return Q5;break}}if(J.match_length=0,Q=g5(J,0,J.window[J.strstart]),J.lookahead--,J.strstart++,Q){if(H5(J,!1),J.strm.avail_out===0)return Q5}}if(J.insert=0,W===j5){if(H5(J,!0),J.strm.avail_out===0)return Q6;return E6}if(J.sym_next){if(H5(J,!1),J.strm.avail_out===0)return Q5}return T6};function T5(J,W,Q,Y,z){this.good_length=J,this.max_lazy=W,this.nice_length=Q,this.max_chain=Y,this.func=z}var o6=[new T5(0,0,0,0,L9),new T5(4,4,8,4,u0),new T5(4,5,16,8,u0),new T5(4,6,32,32,u0),new T5(4,4,16,16,j6),new T5(8,16,32,32,j6),new T5(8,16,128,128,j6),new T5(8,32,128,256,j6),new T5(32,128,258,1024,j6),new T5(32,258,258,4096,j6)],H4=(J)=>{J.window_size=2*J.w_size,h5(J.head),J.max_lazy_match=o6[J.level].max_lazy,J.good_match=o6[J.level].good_length,J.nice_match=o6[J.level].nice_length,J.max_chain_length=o6[J.level].max_chain,J.strstart=0,J.block_start=0,J.lookahead=0,J.insert=0,J.match_length=J.prev_length=v-1,J.match_available=0,J.ins_h=0};function $4(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=u8,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.legacy_hash=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new Uint16Array(G4*2),this.dyn_dtree=new Uint16Array((2*W4+1)*2),this.bl_tree=new Uint16Array((2*Y4+1)*2),h5(this.dyn_ltree),h5(this.dyn_dtree),h5(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new Uint16Array(z4+1),this.heap=new Uint16Array(2*s0+1),h5(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new Uint16Array(2*s0+1),h5(this.depth),this.sym_buf=0,this.lit_bufsize=0,this.sym_next=0,this.sym_end=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}var Z8=(J)=>{if(!J)return 1;let W=J.state;if(!W||W.strm!==J||W.status!==C6&&W.status!==ZJ&&W.status!==t0&&W.status!==e0&&W.status!==JJ&&W.status!==QJ&&W.status!==t5&&W.status!==r6)return 1;return 0},B9=(J)=>{if(Z8(J))return e5(J,N5);J.total_in=J.total_out=0,J.data_type=aW;let W=J.state;if(W.pending=0,W.pending_out=0,W.wrap<0)W.wrap=-W.wrap;return W.status=W.wrap===2?ZJ:W.wrap?C6:t5,J.adler=W.wrap===2?0:1,W.last_flush=-2,uW(W),a},j9=(J)=>{let W=B9(J);if(W===a)H4(J.state);return W},q4=(J,W)=>{if(Z8(J)||J.state.wrap!==2)return N5;return J.state.gzhead=W,a},M9=(J,W,Q,Y,z,G,Z)=>{if(!J)return N5;let F=1;if(W===lW)W=6;if(Y<0)F=0,Y=-Y;else if(Y>15)F=2,Y-=16;if(z<1||z>sW||Q!==u8||Y<8||Y>15||W<0||W>9||G<0||G>rW||Y===8&&F!==1)return e5(J,N5);if(Y===8)Y=9;let U=new $4;if(J.state=U,U.strm=J,U.status=C6,U.wrap=F,U.gzhead=null,U.w_bits=Y,U.w_size=1<<U.w_bits,U.w_mask=U.w_size-1,U.legacy_hash=Z?1:0,U.hash_bits=z+7,!U.legacy_hash&&U.hash_bits<15)U.hash_bits=15;return U.hash_size=1<<U.hash_bits,U.hash_mask=U.hash_size-1,U.hash_shift=~~((U.hash_bits+v-1)/v),U.window=new Uint8Array(U.w_size*2),U.head=new Uint16Array(U.hash_size),U.prev=new Uint16Array(U.w_size),U.lit_bufsize=1<<z+6,U.pending_buf_size=U.lit_bufsize*4,U.pending_buf=new Uint8Array(U.pending_buf_size),U.sym_buf=U.lit_bufsize,U.sym_end=(U.lit_bufsize-1)*3,U.level=W,U.strategy=G,U.method=Q,j9(J)},V4=(J,W)=>{return M9(J,W,u8,tW,eW,oW)},L4=(J,W)=>{if(Z8(J)||W>M7||W<0)return J?e5(J,N5):N5;let Q=J.state;if(!J.output||J.avail_in!==0&&!J.input||Q.status===r6&&W!==j5)return e5(J,J.avail_out===0?h0:N5);let Y=Q.last_flush;if(Q.last_flush=W,Q.pending!==0){if(F5(J),J.avail_out===0)return Q.last_flush=-1,a}else if(J.avail_in===0&&O7(W)<=O7(Y)&&W!==j5)return e5(J,h0);if(Q.status===r6&&J.avail_in!==0)return e5(J,h0);if(Q.status===C6&&Q.wrap===0)Q.status=t5;if(Q.status===C6){let z=u8+(Q.w_bits-8<<4)<<8,G=-1;if(Q.strategy>=S8||Q.level<2)G=0;else if(Q.level<6)G=1;else if(Q.level===6)G=2;else G=3;if(z|=G<<6,Q.strstart!==0)z|=U4;if(z+=31-z%31,n6(Q,z),Q.strstart!==0)n6(Q,J.adler>>>16),n6(Q,J.adler&65535);if(J.adler=1,Q.status=t5,F5(J),Q.pending!==0)return Q.last_flush=-1,a}if(Q.status===ZJ)if(J.adler=0,x(Q,31),x(Q,139),x(Q,8),!Q.gzhead){if(x(Q,0),x(Q,0),x(Q,0),x(Q,0),x(Q,0),x(Q,Q.level===9?2:Q.strategy>=S8||Q.level<2?4:0),x(Q,Z4),Q.status=t5,F5(J),Q.pending!==0)return Q.last_flush=-1,a}else{if(x(Q,(Q.gzhead.text?1:0)+(Q.gzhead.hcrc?2:0)+(!Q.gzhead.extra?0:4)+(!Q.gzhead.name?0:8)+(!Q.gzhead.comment?0:16)),x(Q,Q.gzhead.time&255),x(Q,Q.gzhead.time>>8&255),x(Q,Q.gzhead.time>>16&255),x(Q,Q.gzhead.time>>24&255),x(Q,Q.level===9?2:Q.strategy>=S8||Q.level<2?4:0),x(Q,Q.gzhead.os&255),Q.gzhead.extra&&Q.gzhead.extra.length)x(Q,Q.gzhead.extra.length&255),x(Q,Q.gzhead.extra.length>>8&255);if(Q.gzhead.hcrc)J.adler=r(J.adler,Q.pending_buf,Q.pending,0);Q.gzindex=0,Q.status=t0}if(Q.status===t0){if(Q.gzhead.extra){let z=Q.pending,G=(Q.gzhead.extra.length&65535)-Q.gzindex;while(Q.pending+G>Q.pending_buf_size){let F=Q.pending_buf_size-Q.pending;if(Q.pending_buf.set(Q.gzhead.extra.subarray(Q.gzindex,Q.gzindex+F),Q.pending),Q.pending=Q.pending_buf_size,Q.gzhead.hcrc&&Q.pending>z)J.adler=r(J.adler,Q.pending_buf,Q.pending-z,z);if(Q.gzindex+=F,F5(J),Q.pending!==0)return Q.last_flush=-1,a;z=0,G-=F}let Z=new Uint8Array(Q.gzhead.extra);if(Q.pending_buf.set(Z.subarray(Q.gzindex,Q.gzindex+G),Q.pending),Q.pending+=G,Q.gzhead.hcrc&&Q.pending>z)J.adler=r(J.adler,Q.pending_buf,Q.pending-z,z);Q.gzindex=0}Q.status=e0}if(Q.status===e0){if(Q.gzhead.name){let z=Q.pending,G;do{if(Q.pending===Q.pending_buf_size){if(Q.gzhead.hcrc&&Q.pending>z)J.adler=r(J.adler,Q.pending_buf,Q.pending-z,z);if(F5(J),Q.pending!==0)return Q.last_flush=-1,a;z=0}if(Q.gzindex<Q.gzhead.name.length)G=Q.gzhead.name.charCodeAt(Q.gzindex++)&255;else G=0;x(Q,G)}while(G!==0);if(Q.gzhead.hcrc&&Q.pending>z)J.adler=r(J.adler,Q.pending_buf,Q.pending-z,z);Q.gzindex=0}Q.status=JJ}if(Q.status===JJ){if(Q.gzhead.comment){let z=Q.pending,G;do{if(Q.pending===Q.pending_buf_size){if(Q.gzhead.hcrc&&Q.pending>z)J.adler=r(J.adler,Q.pending_buf,Q.pending-z,z);if(F5(J),Q.pending!==0)return Q.last_flush=-1,a;z=0}if(Q.gzindex<Q.gzhead.comment.length)G=Q.gzhead.comment.charCodeAt(Q.gzindex++)&255;else G=0;x(Q,G)}while(G!==0);if(Q.gzhead.hcrc&&Q.pending>z)J.adler=r(J.adler,Q.pending_buf,Q.pending-z,z)}Q.status=QJ}if(Q.status===QJ){if(Q.gzhead.hcrc){if(Q.pending+2>Q.pending_buf_size){if(F5(J),Q.pending!==0)return Q.last_flush=-1,a}x(Q,J.adler&255),x(Q,J.adler>>8&255),J.adler=0}if(Q.status=t5,F5(J),Q.pending!==0)return Q.last_flush=-1,a}if(J.avail_in!==0||Q.lookahead!==0||W!==c5&&Q.status!==r6){let z=Q.level===0?L9(Q,W):Q.strategy===S8?F4(Q,W):Q.strategy===nW?X4(Q,W):o6[Q.level].func(Q,W);if(z===Q6||z===E6)Q.status=r6;if(z===Q5||z===Q6){if(J.avail_out===0)Q.last_flush=-1;return a}if(z===T6){if(W===mW)cW(Q);else if(W!==M7){if(a0(Q,0,0,!1),W===pW){if(h5(Q.head),Q.lookahead===0)Q.strstart=0,Q.block_start=0,Q.insert=0}}if(F5(J),J.avail_out===0)return Q.last_flush=-1,a}}if(W!==j5)return a;if(Q.wrap<=0)return P7;if(Q.wrap===2)x(Q,J.adler&255),x(Q,J.adler>>8&255),x(Q,J.adler>>16&255),x(Q,J.adler>>24&255),x(Q,J.total_in&255),x(Q,J.total_in>>8&255),x(Q,J.total_in>>16&255),x(Q,J.total_in>>24&255);else n6(Q,J.adler>>>16),n6(Q,J.adler&65535);if(F5(J),Q.wrap>0)Q.wrap=-Q.wrap;return Q.pending!==0?a:P7},B4=(J)=>{if(Z8(J))return N5;let W=J.state.status;return J.state=null,W===t5?e5(J,dW):a},j4=(J,W)=>{let Q=W.length;if(Z8(J))return N5;let Y=J.state,z=Y.wrap;if(z===2||z===1&&Y.status!==C6||Y.lookahead)return N5;if(z===1)J.adler=Y8(J.adler,W,Q,0);if(Y.wrap=0,Q>=Y.w_size){if(z===0)h5(Y.head),Y.strstart=0,Y.block_start=0,Y.insert=0;let U=new Uint8Array(Y.w_size);U.set(W.subarray(Q-Y.w_size,Q),0),W=U,Q=Y.w_size}let{avail_in:G,next_in:Z,input:F}=J;J.avail_in=Q,J.next_in=0,J.input=W,A6(Y);while(Y.lookahead>=v){let U=Y.strstart,X=Y.lookahead-(v-1);do W6(Y,U),U++;while(--X);Y.strstart=U,Y.lookahead=v-1,A6(Y)}return Y.strstart+=Y.lookahead,Y.block_start=Y.strstart,Y.insert=Y.lookahead,Y.lookahead=0,Y.match_length=Y.prev_length=v-1,Y.match_available=0,J.next_in=Z,J.input=F,J.avail_in=G,Y.wrap=z,a},M4=V4,P4=M9,O4=j9,C4=B9,A4=q4,R4=L4,T4=B4,E4=j4,w4="pako deflate (from Nodeca project)",s6={deflateInit:M4,deflateInit2:P4,deflateReset:O4,deflateResetKeep:C4,deflateSetHeader:A4,deflate:R4,deflateEnd:T4,deflateSetDictionary:E4,deflateInfo:w4},N4=(J,W)=>{return Object.prototype.hasOwnProperty.call(J,W)},D4=function(J){let W=Array.prototype.slice.call(arguments,1);while(W.length){let Q=W.shift();if(!Q)continue;if(typeof Q!=="object")throw TypeError(Q+"must be non-object");for(let Y in Q)if(N4(Q,Y))J[Y]=Q[Y]}return J},k4=(J)=>{let W=0;for(let Y=0,z=J.length;Y<z;Y++)W+=J[Y].length;let Q=new Uint8Array(W);for(let Y=0,z=0,G=J.length;Y<G;Y++){let Z=J[Y];Q.set(Z,z),z+=Z.length}return Q},g8={assign:D4,flattenChunks:k4},P9=!0;try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(J){P9=!1}var G8=new Uint8Array(256);for(let J=0;J<256;J++)G8[J]=J>=252?6:J>=248?5:J>=240?4:J>=224?3:J>=192?2:1;G8[254]=G8[255]=1;var S4=(J)=>{if(typeof TextEncoder==="function"&&TextEncoder.prototype.encode)return new TextEncoder().encode(J);let W,Q,Y,z,G,Z=J.length,F=0;for(z=0;z<Z;z++){if(Q=J.charCodeAt(z),(Q&64512)===55296&&z+1<Z){if(Y=J.charCodeAt(z+1),(Y&64512)===56320)Q=65536+(Q-55296<<10)+(Y-56320),z++}F+=Q<128?1:Q<2048?2:Q<65536?3:4}W=new Uint8Array(F);for(G=0,z=0;G<F;z++){if(Q=J.charCodeAt(z),(Q&64512)===55296&&z+1<Z){if(Y=J.charCodeAt(z+1),(Y&64512)===56320)Q=65536+(Q-55296<<10)+(Y-56320),z++}if(Q<128)W[G++]=Q;else if(Q<2048)W[G++]=192|Q>>>6,W[G++]=128|Q&63;else if(Q<65536)W[G++]=224|Q>>>12,W[G++]=128|Q>>>6&63,W[G++]=128|Q&63;else W[G++]=240|Q>>>18,W[G++]=128|Q>>>12&63,W[G++]=128|Q>>>6&63,W[G++]=128|Q&63}return W},I4=(J,W)=>{if(W<65534){if(J.subarray&&P9)return String.fromCharCode.apply(null,J.length===W?J:J.subarray(0,W))}let Q="";for(let Y=0;Y<W;Y++)Q+=String.fromCharCode(J[Y]);return Q},y4=(J,W)=>{let Q=W||J.length;if(typeof TextDecoder==="function"&&TextDecoder.prototype.decode)return new TextDecoder().decode(J.subarray(0,W));let Y,z,G=Array(Q*2);for(z=0,Y=0;Y<Q;){let Z=J[Y++];if(Z<128){G[z++]=Z;continue}let F=G8[Z];if(F>4){G[z++]=65533,Y+=F-1;continue}Z&=F===2?31:F===3?15:7;while(F>1&&Y<Q)Z=Z<<6|J[Y++]&63,F--;if(F>1){G[z++]=65533;continue}if(Z<65536)G[z++]=Z;else Z-=65536,G[z++]=55296|Z>>10&1023,G[z++]=56320|Z&1023}return I4(G,z)},b4=(J,W)=>{if(W=W||J.length,W>J.length)W=J.length;let Q=W-1;while(Q>=0&&(J[Q]&192)===128)Q--;if(Q<0)return W;if(Q===0)return W;return Q+G8[J[Q]]>W?Q:W},z8={string2buf:S4,buf2string:y4,utf8border:b4};function f4(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}var O9=f4,C9=Object.prototype.toString,{Z_NO_FLUSH:v4,Z_SYNC_FLUSH:_4,Z_FULL_FLUSH:x4,Z_FINISH:h4,Z_OK:x8,Z_STREAM_END:u4,Z_DEFAULT_COMPRESSION:g4,Z_DEFAULT_STRATEGY:c4,Z_DEFLATED:m4}=G6,p4={level:g4,method:m4,chunkSize:16384,windowBits:15,memLevel:8,strategy:c4,legacyHash:!0};function K8(J){this.options=g8.assign({},p4,J||{});let W=this.options;if(W.raw&&W.windowBits>0)W.windowBits=-W.windowBits;else if(W.gzip&&W.windowBits>0&&W.windowBits<16)W.windowBits+=16;this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new O9,this.strm.avail_out=0;let Q=s6.deflateInit2(this.strm,W.level,W.method,W.windowBits,W.memLevel,W.strategy,W.legacyHash);if(Q!==x8)throw Error(J6[Q]);if(W.header)s6.deflateSetHeader(this.strm,W.header);if(W.dictionary){let Y;if(typeof W.dictionary==="string")Y=z8.string2buf(W.dictionary);else if(C9.call(W.dictionary)==="[object ArrayBuffer]")Y=new Uint8Array(W.dictionary);else Y=W.dictionary;if(Q=s6.deflateSetDictionary(this.strm,Y),Q!==x8)throw Error(J6[Q]);this._dict_set=!0}}K8.prototype.push=function(J,W){let Q=this.strm,Y=this.options.chunkSize,z,G;if(this.ended)return!1;if(W===~~W)G=W;else G=W===!0?h4:v4;if(typeof J==="string")Q.input=z8.string2buf(J);else if(C9.call(J)==="[object ArrayBuffer]")Q.input=new Uint8Array(J);else Q.input=J;Q.next_in=0,Q.avail_in=Q.input.length;for(;;){if(Q.avail_out===0)Q.output=new Uint8Array(Y),Q.next_out=0,Q.avail_out=Y;if((G===_4||G===x4)&&Q.avail_out<=6){this.onData(Q.output.subarray(0,Q.next_out)),Q.avail_out=0;continue}if(z=s6.deflate(Q,G),z===u4){if(Q.next_out>0)this.onData(Q.output.subarray(0,Q.next_out));return z=s6.deflateEnd(this.strm),this.onEnd(z),this.ended=!0,z===x8}if(Q.avail_out===0){this.onData(Q.output);continue}if(G>0&&Q.next_out>0){this.onData(Q.output.subarray(0,Q.next_out)),Q.avail_out=0;continue}if(Q.avail_in===0)break}return!0};K8.prototype.onData=function(J){this.chunks.push(J)};K8.prototype.onEnd=function(J){if(J===x8)this.result=g8.flattenChunks(this.chunks);this.chunks=[],this.err=J,this.msg=this.strm.msg};function XJ(J,W){let Q=new K8(W);if(Q.push(J,!0),Q.err)throw Q.msg||J6[Q.err];return Q.result}function d4(J,W){return W=W||{},W.raw=!0,XJ(J,W)}function l4(J,W){return W=W||{},W.gzip=!0,XJ(J,W)}var i4=K8,n4=XJ,r4=d4,o4=l4,a4=G6,s4={Deflate:i4,deflate:n4,deflateRaw:r4,gzip:o4,constants:a4},I8=16209,t4=16191,e4=function(W,Q){let Y,z,G,Z,F,U,X,K,$,H,q,V,L,B,O,j,P,M,T,w,C,D,N,A,R=W.state;Y=W.next_in,N=W.input,z=Y+(W.avail_in-5),G=W.next_out,A=W.output,Z=G-(Q-W.avail_out),F=G+(W.avail_out-257),U=R.dmax,X=R.wsize,K=R.whave,$=R.wnext,H=R.window,q=R.hold,V=R.bits,L=R.lencode,B=R.distcode,O=(1<<R.lenbits)-1,j=(1<<R.distbits)-1;J:do{if(V<15)q+=N[Y++]<<V,V+=8,q+=N[Y++]<<V,V+=8;P=L[q&O];Q:for(;;){if(M=P>>>24,q>>>=M,V-=M,M=P>>>16&255,M===0)A[G++]=P&65535;else if(M&16){if(T=P&65535,M&=15,M){if(V<M)q+=N[Y++]<<V,V+=8;T+=q&(1<<M)-1,q>>>=M,V-=M}if(V<15)q+=N[Y++]<<V,V+=8,q+=N[Y++]<<V,V+=8;P=B[q&j];W:for(;;){if(M=P>>>24,q>>>=M,V-=M,M=P>>>16&255,M&16){if(w=P&65535,M&=15,V<M){if(q+=N[Y++]<<V,V+=8,V<M)q+=N[Y++]<<V,V+=8}if(w+=q&(1<<M)-1,w>U){W.msg="invalid distance too far back",R.mode=I8;break J}if(q>>>=M,V-=M,M=G-Z,w>M){if(M=w-M,M>K){if(R.sane){W.msg="invalid distance too far back",R.mode=I8;break J}}if(C=0,D=H,$===0){if(C+=X-M,M<T){T-=M;do A[G++]=H[C++];while(--M);C=G-w,D=A}}else if($<M){if(C+=X+$-M,M-=$,M<T){T-=M;do A[G++]=H[C++];while(--M);if(C=0,$<T){M=$,T-=M;do A[G++]=H[C++];while(--M);C=G-w,D=A}}}else if(C+=$-M,M<T){T-=M;do A[G++]=H[C++];while(--M);C=G-w,D=A}while(T>2)A[G++]=D[C++],A[G++]=D[C++],A[G++]=D[C++],T-=3;if(T){if(A[G++]=D[C++],T>1)A[G++]=D[C++]}}else{C=G-w;do A[G++]=A[C++],A[G++]=A[C++],A[G++]=A[C++],T-=3;while(T>2);if(T){if(A[G++]=A[C++],T>1)A[G++]=A[C++]}}}else if((M&64)===0){P=B[(P&65535)+(q&(1<<M)-1)];continue W}else{W.msg="invalid distance code",R.mode=I8;break J}break}}else if((M&64)===0){P=L[(P&65535)+(q&(1<<M)-1)];continue Q}else if(M&32){R.mode=t4;break J}else{W.msg="invalid literal/length code",R.mode=I8;break J}break}}while(Y<z&&G<F);T=V>>3,Y-=T,V-=T<<3,q&=(1<<V)-1,W.next_in=Y,W.next_out=G,W.avail_in=Y<z?5+(z-Y):5-(Y-z),W.avail_out=G<F?257+(F-G):257-(G-F),R.hold=q,R.bits=V;return},M6=15,C7=852,A7=592,R7=0,g0=1,T7=2,JY=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),QY=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,199,75]),WY=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),YY=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]),GY=(J,W,Q,Y,z,G,Z,F)=>{let U=F.bits,X=0,K=0,$=0,H=0,q=0,V=0,L=0,B=0,O=0,j=0,P,M,T,w,C,D=null,N,A=new Uint16Array(M6+1),R=new Uint16Array(M6+1),_=null,V5,y,i;for(X=0;X<=M6;X++)A[X]=0;for(K=0;K<Y;K++)A[W[Q+K]]++;q=U;for(H=M6;H>=1;H--)if(A[H]!==0)break;if(q>H)q=H;if(H===0)return z[G++]=20971520,z[G++]=20971520,F.bits=1,0;for($=1;$<H;$++)if(A[$]!==0)break;if(q<$)q=$;B=1;for(X=1;X<=M6;X++)if(B<<=1,B-=A[X],B<0)return-1;if(B>0&&(J===R7||H!==1))return-1;R[1]=0;for(X=1;X<M6;X++)R[X+1]=R[X]+A[X];for(K=0;K<Y;K++)if(W[Q+K]!==0)Z[R[W[Q+K]]++]=K;if(J===R7)D=_=Z,N=20;else if(J===g0)D=JY,_=QY,N=257;else D=WY,_=YY,N=0;if(j=0,K=0,X=$,C=G,V=q,L=0,T=-1,O=1<<q,w=O-1,J===g0&&O>C7||J===T7&&O>A7)return 1;for(;;){if(V5=X-L,Z[K]+1<N)y=0,i=Z[K];else if(Z[K]>=N)y=_[Z[K]-N],i=D[Z[K]-N];else y=96,i=0;P=1<<X-L,M=1<<V,$=M;do M-=P,z[C+(j>>L)+M]=V5<<24|y<<16|i|0;while(M!==0);P=1<<X-1;while(j&P)P>>=1;if(P!==0)j&=P-1,j+=P;else j=0;if(K++,--A[X]===0){if(X===H)break;X=W[Q+Z[K]]}if(X>q&&(j&w)!==T){if(L===0)L=q;C+=$,V=X-L,B=1<<V;while(V+L<H){if(B-=A[V+L],B<=0)break;V++,B<<=1}if(O+=1<<V,J===g0&&O>C7||J===T7&&O>A7)return 1;T=j&w,z[T]=q<<24|V<<16|C-G|0}}if(j!==0)z[C+j]=X-L<<24|4194304|0;return F.bits=q,0},t6=GY,zY=0,A9=1,R9=2,{Z_FINISH:E7,Z_BLOCK:UY,Z_TREES:y8,Z_OK:Y6,Z_STREAM_END:ZY,Z_NEED_DICT:KY,Z_STREAM_ERROR:M5,Z_DATA_ERROR:T9,Z_MEM_ERROR:E9,Z_BUF_ERROR:XY,Z_DEFLATED:w7}=G6,c8=16180,N7=16181,D7=16182,k7=16183,S7=16184,I7=16185,y7=16186,b7=16187,f7=16188,v7=16189,h8=16190,b5=16191,c0=16192,_7=16193,m0=16194,x7=16195,h7=16196,u7=16197,g7=16198,b8=16199,f8=16200,c7=16201,m7=16202,p7=16203,d7=16204,l7=16205,p0=16206,i7=16207,n7=16208,m=16209,w9=16210,N9=16211,FY=852,HY=592,$Y=15,qY=$Y,r7=(J)=>{return(J>>>24&255)+(J>>>8&65280)+((J&65280)<<8)+((J&255)<<24)};function VY(){this.strm=null,this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new Uint16Array(320),this.work=new Uint16Array(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}var z6=(J)=>{if(!J)return 1;let W=J.state;if(!W||W.strm!==J||W.mode<c8||W.mode>N9)return 1;return 0},D9=(J)=>{if(z6(J))return M5;let W=J.state;if(J.total_in=J.total_out=W.total=0,J.msg="",W.wrap)J.adler=W.wrap&1;return W.mode=c8,W.last=0,W.havedict=0,W.flags=-1,W.dmax=32768,W.head=null,W.hold=0,W.bits=0,W.lencode=W.lendyn=new Int32Array(FY),W.distcode=W.distdyn=new Int32Array(HY),W.sane=1,W.back=-1,Y6},k9=(J)=>{if(z6(J))return M5;let W=J.state;return W.wsize=0,W.whave=0,W.wnext=0,D9(J)},S9=(J,W)=>{let Q;if(z6(J))return M5;let Y=J.state;if(W<0)Q=0,W=-W;else if(Q=(W>>4)+5,W<48)W&=15;if(W&&(W<8||W>15))return M5;if(Y.window!==null&&Y.wbits!==W)Y.window=null;return Y.wrap=Q,Y.wbits=W,k9(J)},I9=(J,W)=>{if(!J)return M5;let Q=new VY;J.state=Q,Q.strm=J,Q.window=null,Q.mode=c8;let Y=S9(J,W);if(Y!==Y6)J.state=null;return Y},LY=(J)=>{return I9(J,qY)},o7=!0,d0,l0,BY=(J)=>{if(o7){d0=new Int32Array(512),l0=new Int32Array(32);let W=0;while(W<144)J.lens[W++]=8;while(W<256)J.lens[W++]=9;while(W<280)J.lens[W++]=7;while(W<288)J.lens[W++]=8;t6(A9,J.lens,0,288,d0,0,J.work,{bits:9}),W=0;while(W<32)J.lens[W++]=5;t6(R9,J.lens,0,32,l0,0,J.work,{bits:5}),o7=!1}J.lencode=d0,J.lenbits=9,J.distcode=l0,J.distbits=5},y9=(J,W,Q,Y)=>{let z,G=J.state;if(G.window===null)G.window=new Uint8Array(1<<G.wbits);if(G.wsize===0)G.wsize=1<<G.wbits,G.wnext=0,G.whave=0;if(Y>=G.wsize)G.window.set(W.subarray(Q-G.wsize,Q),0),G.wnext=0,G.whave=G.wsize;else{if(z=G.wsize-G.wnext,z>Y)z=Y;if(G.window.set(W.subarray(Q-Y,Q-Y+z),G.wnext),Y-=z,Y)G.window.set(W.subarray(Q-Y,Q),0),G.wnext=Y,G.whave=G.wsize;else{if(G.wnext+=z,G.wnext===G.wsize)G.wnext=0;if(G.whave<G.wsize)G.whave+=z}}return 0},jY=(J,W)=>{let Q,Y,z,G,Z,F,U,X,K,$,H,q,V,L,B=0,O,j,P,M,T,w,C,D,N=new Uint8Array(4),A,R,_=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);if(z6(J)||!J.output||!J.input&&J.avail_in!==0)return M5;if(Q=J.state,Q.mode===b5)Q.mode=c0;Z=J.next_out,z=J.output,U=J.avail_out,G=J.next_in,Y=J.input,F=J.avail_in,X=Q.hold,K=Q.bits,$=F,H=U,D=Y6;J:for(;;)switch(Q.mode){case c8:if(Q.wrap===0){Q.mode=c0;break}while(K<16){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if(Q.wrap&2&&X===35615){if(Q.wbits===0)Q.wbits=15;Q.check=0,N[0]=X&255,N[1]=X>>>8&255,Q.check=r(Q.check,N,2,0),X=0,K=0,Q.mode=N7;break}if(Q.head)Q.head.done=!1;if(!(Q.wrap&1)||(((X&255)<<8)+(X>>8))%31){J.msg="incorrect header check",Q.mode=m;break}if((X&15)!==w7){J.msg="unknown compression method",Q.mode=m;break}if(X>>>=4,K-=4,C=(X&15)+8,Q.wbits===0)Q.wbits=C;if(C>15||C>Q.wbits){J.msg="invalid window size",Q.mode=m;break}Q.dmax=1<<Q.wbits,Q.flags=0,J.adler=Q.check=1,Q.mode=X&512?v7:b5,X=0,K=0;break;case N7:while(K<16){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if(Q.flags=X,(Q.flags&255)!==w7){J.msg="unknown compression method",Q.mode=m;break}if(Q.flags&57344){J.msg="unknown header flags set",Q.mode=m;break}if(Q.head)Q.head.text=X>>8&1;if(Q.flags&512&&Q.wrap&4)N[0]=X&255,N[1]=X>>>8&255,Q.check=r(Q.check,N,2,0);X=0,K=0,Q.mode=D7;case D7:while(K<32){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if(Q.head)Q.head.time=X;if(Q.flags&512&&Q.wrap&4)N[0]=X&255,N[1]=X>>>8&255,N[2]=X>>>16&255,N[3]=X>>>24&255,Q.check=r(Q.check,N,4,0);X=0,K=0,Q.mode=k7;case k7:while(K<16){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if(Q.head)Q.head.xflags=X&255,Q.head.os=X>>8;if(Q.flags&512&&Q.wrap&4)N[0]=X&255,N[1]=X>>>8&255,Q.check=r(Q.check,N,2,0);X=0,K=0,Q.mode=S7;case S7:if(Q.flags&1024){while(K<16){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if(Q.length=X,Q.head)Q.head.extra_len=X;if(Q.flags&512&&Q.wrap&4)N[0]=X&255,N[1]=X>>>8&255,Q.check=r(Q.check,N,2,0);X=0,K=0}else if(Q.head)Q.head.extra=null;Q.mode=I7;case I7:if(Q.flags&1024){if(q=Q.length,q>F)q=F;if(q){if(Q.head){if(C=Q.head.extra_len-Q.length,!Q.head.extra)Q.head.extra=new Uint8Array(Q.head.extra_len);Q.head.extra.set(Y.subarray(G,G+q),C)}if(Q.flags&512&&Q.wrap&4)Q.check=r(Q.check,Y,q,G);F-=q,G+=q,Q.length-=q}if(Q.length)break J}Q.length=0,Q.mode=y7;case y7:if(Q.flags&2048){if(F===0)break J;q=0;do if(C=Y[G+q++],Q.head&&C&&Q.length<65536)Q.head.name+=String.fromCharCode(C);while(C&&q<F);if(Q.flags&512&&Q.wrap&4)Q.check=r(Q.check,Y,q,G);if(F-=q,G+=q,C)break J}else if(Q.head)Q.head.name=null;Q.length=0,Q.mode=b7;case b7:if(Q.flags&4096){if(F===0)break J;q=0;do if(C=Y[G+q++],Q.head&&C&&Q.length<65536)Q.head.comment+=String.fromCharCode(C);while(C&&q<F);if(Q.flags&512&&Q.wrap&4)Q.check=r(Q.check,Y,q,G);if(F-=q,G+=q,C)break J}else if(Q.head)Q.head.comment=null;Q.mode=f7;case f7:if(Q.flags&512){while(K<16){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if(Q.wrap&4&&X!==(Q.check&65535)){J.msg="header crc mismatch",Q.mode=m;break}X=0,K=0}if(Q.head)Q.head.hcrc=Q.flags>>9&1,Q.head.done=!0;J.adler=Q.check=0,Q.mode=b5;break;case v7:while(K<32){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}J.adler=Q.check=r7(X),X=0,K=0,Q.mode=h8;case h8:if(Q.havedict===0)return J.next_out=Z,J.avail_out=U,J.next_in=G,J.avail_in=F,Q.hold=X,Q.bits=K,KY;J.adler=Q.check=1,Q.mode=b5;case b5:if(W===UY||W===y8)break J;case c0:if(Q.last){X>>>=K&7,K-=K&7,Q.mode=p0;break}while(K<3){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}switch(Q.last=X&1,X>>>=1,K-=1,X&3){case 0:Q.mode=_7;break;case 1:if(BY(Q),Q.mode=b8,W===y8){X>>>=2,K-=2;break J}break;case 2:Q.mode=h7;break;case 3:J.msg="invalid block type",Q.mode=m}X>>>=2,K-=2;break;case _7:X>>>=K&7,K-=K&7;while(K<32){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if((X&65535)!==(X>>>16^65535)){J.msg="invalid stored block lengths",Q.mode=m;break}if(Q.length=X&65535,X=0,K=0,Q.mode=m0,W===y8)break J;case m0:Q.mode=x7;case x7:if(q=Q.length,q){if(q>F)q=F;if(q>U)q=U;if(q===0)break J;z.set(Y.subarray(G,G+q),Z),F-=q,G+=q,U-=q,Z+=q,Q.length-=q;break}Q.mode=b5;break;case h7:while(K<14){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if(Q.nlen=(X&31)+257,X>>>=5,K-=5,Q.ndist=(X&31)+1,X>>>=5,K-=5,Q.ncode=(X&15)+4,X>>>=4,K-=4,Q.nlen>286||Q.ndist>30){J.msg="too many length or distance symbols",Q.mode=m;break}Q.have=0,Q.mode=u7;case u7:while(Q.have<Q.ncode){while(K<3){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}Q.lens[_[Q.have++]]=X&7,X>>>=3,K-=3}while(Q.have<19)Q.lens[_[Q.have++]]=0;if(Q.lencode=Q.lendyn,Q.lenbits=7,A={bits:Q.lenbits},D=t6(zY,Q.lens,0,19,Q.lencode,0,Q.work,A),Q.lenbits=A.bits,D){J.msg="invalid code lengths set",Q.mode=m;break}Q.have=0,Q.mode=g7;case g7:while(Q.have<Q.nlen+Q.ndist){for(;;){if(B=Q.lencode[X&(1<<Q.lenbits)-1],O=B>>>24,j=B>>>16&255,P=B&65535,O<=K)break;if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if(P<16)X>>>=O,K-=O,Q.lens[Q.have++]=P;else{if(P===16){R=O+2;while(K<R){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if(X>>>=O,K-=O,Q.have===0){J.msg="invalid bit length repeat",Q.mode=m;break}C=Q.lens[Q.have-1],q=3+(X&3),X>>>=2,K-=2}else if(P===17){R=O+3;while(K<R){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}X>>>=O,K-=O,C=0,q=3+(X&7),X>>>=3,K-=3}else{R=O+7;while(K<R){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}X>>>=O,K-=O,C=0,q=11+(X&127),X>>>=7,K-=7}if(Q.have+q>Q.nlen+Q.ndist){J.msg="invalid bit length repeat",Q.mode=m;break}while(q--)Q.lens[Q.have++]=C}}if(Q.mode===m)break;if(Q.lens[256]===0){J.msg="invalid code -- missing end-of-block",Q.mode=m;break}if(Q.lenbits=9,A={bits:Q.lenbits},D=t6(A9,Q.lens,0,Q.nlen,Q.lencode,0,Q.work,A),Q.lenbits=A.bits,D){J.msg="invalid literal/lengths set",Q.mode=m;break}if(Q.distbits=6,Q.distcode=Q.distdyn,A={bits:Q.distbits},D=t6(R9,Q.lens,Q.nlen,Q.ndist,Q.distcode,0,Q.work,A),Q.distbits=A.bits,D){J.msg="invalid distances set",Q.mode=m;break}if(Q.mode=b8,W===y8)break J;case b8:Q.mode=f8;case f8:if(F>=6&&U>=258){if(J.next_out=Z,J.avail_out=U,J.next_in=G,J.avail_in=F,Q.hold=X,Q.bits=K,e4(J,H),Z=J.next_out,z=J.output,U=J.avail_out,G=J.next_in,Y=J.input,F=J.avail_in,X=Q.hold,K=Q.bits,Q.mode===b5)Q.back=-1;break}Q.back=0;for(;;){if(B=Q.lencode[X&(1<<Q.lenbits)-1],O=B>>>24,j=B>>>16&255,P=B&65535,O<=K)break;if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if(j&&(j&240)===0){M=O,T=j,w=P;for(;;){if(B=Q.lencode[w+((X&(1<<M+T)-1)>>M)],O=B>>>24,j=B>>>16&255,P=B&65535,M+O<=K)break;if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}X>>>=M,K-=M,Q.back+=M}if(X>>>=O,K-=O,Q.back+=O,Q.length=P,j===0){Q.mode=l7;break}if(j&32){Q.back=-1,Q.mode=b5;break}if(j&64){J.msg="invalid literal/length code",Q.mode=m;break}Q.extra=j&15,Q.mode=c7;case c7:if(Q.extra){R=Q.extra;while(K<R){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}Q.length+=X&(1<<Q.extra)-1,X>>>=Q.extra,K-=Q.extra,Q.back+=Q.extra}Q.was=Q.length,Q.mode=m7;case m7:for(;;){if(B=Q.distcode[X&(1<<Q.distbits)-1],O=B>>>24,j=B>>>16&255,P=B&65535,O<=K)break;if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if((j&240)===0){M=O,T=j,w=P;for(;;){if(B=Q.distcode[w+((X&(1<<M+T)-1)>>M)],O=B>>>24,j=B>>>16&255,P=B&65535,M+O<=K)break;if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}X>>>=M,K-=M,Q.back+=M}if(X>>>=O,K-=O,Q.back+=O,j&64){J.msg="invalid distance code",Q.mode=m;break}Q.offset=P,Q.extra=j&15,Q.mode=p7;case p7:if(Q.extra){R=Q.extra;while(K<R){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}Q.offset+=X&(1<<Q.extra)-1,X>>>=Q.extra,K-=Q.extra,Q.back+=Q.extra}if(Q.offset>Q.dmax){J.msg="invalid distance too far back",Q.mode=m;break}Q.mode=d7;case d7:if(U===0)break J;if(q=H-U,Q.offset>q){if(q=Q.offset-q,q>Q.whave){if(Q.sane){J.msg="invalid distance too far back",Q.mode=m;break}}if(q>Q.wnext)q-=Q.wnext,V=Q.wsize-q;else V=Q.wnext-q;if(q>Q.length)q=Q.length;L=Q.window}else L=z,V=Z-Q.offset,q=Q.length;if(q>U)q=U;U-=q,Q.length-=q;do z[Z++]=L[V++];while(--q);if(Q.length===0)Q.mode=f8;break;case l7:if(U===0)break J;z[Z++]=Q.length,U--,Q.mode=f8;break;case p0:if(Q.wrap){while(K<32){if(F===0)break J;F--,X|=Y[G++]<<K,K+=8}if(H-=U,J.total_out+=H,Q.total+=H,Q.wrap&4&&H)J.adler=Q.check=Q.flags?r(Q.check,z,H,Z-H):Y8(Q.check,z,H,Z-H);if(H=U,Q.wrap&4&&(Q.flags?X:r7(X))!==Q.check){J.msg="incorrect data check",Q.mode=m;break}X=0,K=0}Q.mode=i7;case i7:if(Q.wrap&&Q.flags){while(K<32){if(F===0)break J;F--,X+=Y[G++]<<K,K+=8}if(Q.wrap&4&&X!==(Q.total&4294967295)){J.msg="incorrect length check",Q.mode=m;break}X=0,K=0}Q.mode=n7;case n7:D=ZY;break J;case m:D=T9;break J;case w9:return E9;case N9:default:return M5}if(J.next_out=Z,J.avail_out=U,J.next_in=G,J.avail_in=F,Q.hold=X,Q.bits=K,Q.wsize||H!==J.avail_out&&Q.mode<m&&(Q.mode<p0||W!==E7)){if(y9(J,J.output,J.next_out,H-J.avail_out));}if($-=J.avail_in,H-=J.avail_out,J.total_in+=$,J.total_out+=H,Q.total+=H,Q.wrap&4&&H)J.adler=Q.check=Q.flags?r(Q.check,z,H,J.next_out-H):Y8(Q.check,z,H,J.next_out-H);if(J.data_type=Q.bits+(Q.last?64:0)+(Q.mode===b5?128:0)+(Q.mode===b8||Q.mode===m0?256:0),($===0&&H===0||W===E7)&&D===Y6)D=XY;return D},MY=(J)=>{if(z6(J))return M5;let W=J.state;if(W.window)W.window=null;return J.state=null,Y6},PY=(J,W)=>{if(z6(J))return M5;let Q=J.state;if((Q.wrap&2)===0)return M5;return Q.head=W,W.done=!1,Y6},OY=(J,W)=>{let Q=W.length,Y,z,G;if(z6(J))return M5;if(Y=J.state,Y.wrap!==0&&Y.mode!==h8)return M5;if(Y.mode===h8){if(z=1,z=Y8(z,W,Q,0),z!==Y.check)return T9}if(G=y9(J,W,Q,Q),G)return Y.mode=w9,E9;return Y.havedict=1,Y6},CY=k9,AY=S9,RY=D9,TY=LY,EY=I9,wY=jY,NY=MY,DY=PY,kY=OY,SY="pako inflate (from Nodeca project)",E5={inflateReset:CY,inflateReset2:AY,inflateResetKeep:RY,inflateInit:TY,inflateInit2:EY,inflate:wY,inflateEnd:NY,inflateGetHeader:DY,inflateSetDictionary:kY,inflateInfo:SY};function IY(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}var yY=IY,b9=Object.prototype.toString,{Z_NO_FLUSH:bY,Z_FINISH:a7,Z_OK:O6,Z_STREAM_END:i0,Z_NEED_DICT:n0,Z_STREAM_ERROR:fY,Z_DATA_ERROR:s7,Z_MEM_ERROR:vY,Z_BUF_ERROR:t7}=G6,_Y={chunkSize:65536,windowBits:15,to:""};function X8(J){this.options=g8.assign({},_Y,J||{});let W=this.options;if(W.raw&&W.windowBits>=0&&W.windowBits<16){if(W.windowBits=-W.windowBits,W.windowBits===0)W.windowBits=-15}if(W.windowBits>=0&&W.windowBits<16&&!(J&&J.windowBits))W.windowBits+=32;if(W.windowBits>15&&W.windowBits<48){if((W.windowBits&15)===0)W.windowBits|=15}this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new O9,this.strm.avail_out=0;let Q=E5.inflateInit2(this.strm,W.windowBits);if(Q!==O6)throw Error(J6[Q]);if(this.header=new yY,E5.inflateGetHeader(this.strm,this.header),W.dictionary){if(typeof W.dictionary==="string")W.dictionary=z8.string2buf(W.dictionary);else if(b9.call(W.dictionary)==="[object ArrayBuffer]")W.dictionary=new Uint8Array(W.dictionary);if(W.raw){if(Q=E5.inflateSetDictionary(this.strm,W.dictionary),Q!==O6)throw Error(J6[Q])}}}X8.prototype.push=function(J,W){let Q=this.strm,Y=this.options.chunkSize,z=this.options.dictionary,G,Z,F;if(this.ended)return!1;if(W===~~W)Z=W;else Z=W===!0?a7:bY;if(b9.call(J)==="[object ArrayBuffer]")Q.input=new Uint8Array(J);else Q.input=J;Q.next_in=0,Q.avail_in=Q.input.length;for(;;){if(Q.avail_out===0)Q.output=new Uint8Array(Y),Q.next_out=0,Q.avail_out=Y;if(G=E5.inflate(Q,Z),G===n0&&z){if(G=E5.inflateSetDictionary(Q,z),G===O6)G=E5.inflate(Q,Z);else if(G===s7)G=n0}while(Q.avail_in>0&&G===i0&&Q.state.wrap&2&&Q.state.flags!==0&&Q.input[Q.next_in]!==0)E5.inflateReset(Q),G=E5.inflate(Q,Z);switch(G){case fY:case s7:case n0:case vY:return this.onEnd(G),this.ended=!0,!1}if(F=Q.avail_out,Q.next_out){if(Q.avail_out===0||G===i0||Z>0)if(this.options.to==="string"){let U=z8.utf8border(Q.output,Q.next_out),X=Q.next_out-U,K=z8.buf2string(Q.output,U);if(Q.next_out=X,Q.avail_out=Y-X,X)Q.output.set(Q.output.subarray(U,U+X),0);this.onData(K)}else this.onData(Q.output.length===Q.next_out?Q.output:Q.output.subarray(0,Q.next_out)),Q.avail_out=0,Q.next_out=0}if((G===O6||G===t7)&&F===0)continue;if(G===i0)return G=E5.inflateEnd(this.strm),this.onEnd(G),this.ended=!0,!0;if(Q.avail_in===0){if(Z===a7)return G=E5.inflateEnd(this.strm),this.onEnd(G===O6?t7:G),this.ended=!0,!1;break}}return!0};X8.prototype.onData=function(J){this.chunks.push(J)};X8.prototype.onEnd=function(J){if(J===O6)if(this.options.to==="string")this.result=this.chunks.join("");else this.result=g8.flattenChunks(this.chunks);this.chunks=[],this.err=J,this.msg=this.strm.msg};function FJ(J,W){let Q=new X8(W);if(Q.push(J,!0),Q.err)throw Q.msg||J6[Q.err];return Q.result}function xY(J,W){return W=W||{},W.raw=!0,FJ(J,W)}var hY=X8,uY=FJ,gY=xY,cY=FJ,mY=G6,pY={Inflate:hY,inflate:uY,inflateRaw:gY,ungzip:cY,constants:mY},{Deflate:dY,deflate:lY,deflateRaw:iY,gzip:nY}=s4,{Inflate:rY,inflate:oY,inflateRaw:aY,ungzip:sY}=pY,tY=dY,eY=lY,JG=iY,QG=nY,WG=rY,YG=oY,GG=aY,zG=sY,UG=G6,HJ={Deflate:tY,deflate:eY,deflateRaw:JG,gzip:QG,Inflate:WG,inflate:YG,inflateRaw:GG,ungzip:zG,constants:UG};var K6=new l6({ignoreAttributes:!1,attributeNamePrefix:"@_",textNodeName:"#text",trimValues:!1}),D6=new b0({ignoreAttributes:!1,attributeNamePrefix:"@_",textNodeName:"#text",format:!1,suppressEmptyNode:!0}),s9=[".drawio",".xml"],f9=[...s9,".bak"],X6=20971520,XG=104857600,FG="http://127.0.0.1:18765/ImageExport4/export",RJ="#ffffff",$8=43200000,HG=3000,v9=20,$G=1800000,qG=7200000,O5="__ai_preview_",VG=20,LG=2000,BG=2,jG=0.25,MG=8388608,t9=1,q8=/^h_[A-Za-z0-9_-]+_[A-Fa-f0-9]{8,}$/,TJ=/^[A-Za-z0-9_.:-]+$/,PG=["DRAWIO_WEB_URL","DRAWIO_BRIDGE_HOST","DRAWIO_BRIDGE_PORT","DRAWIO_EXPORT_URL","DRAWIO_REQUEST_TIMEOUT","DRAWIO_MAX_INPUT_SIZE_MB","DRAWIO_MAX_OUTPUT_SIZE_MB"],kJ="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;jumpStyle=arc;jumpSize=10;endArrow=block;endFill=1;";function _5(J){if(J===void 0)return[];return Array.isArray(J)?J:[J]}function S(J){return J===void 0||J===null?void 0:String(J)}function t(J){if(J===void 0||J===null||J==="")return;let W=Number(J);return Number.isFinite(W)?W:void 0}function S5(J){return J.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;")}function e9(J){let W=J.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase();if(/^[\x00-\x7f]*$/.test(J)&&W)return W;let Q=W0("sha256").update(J).digest("hex").slice(0,12);return`${W||"diagram"}-${Q}`}function b6(J){let W=J.directory.trim();if(!W)throw Error("OpenCode did not provide a workspace directory");return E.resolve(W)}async function OG(J){let W=E.join(b6({directory:J}),".env"),Q;try{Q=await I.readFile(W,"utf8")}catch(z){if(z.code==="ENOENT")return;throw Error(`cannot read workspace .env at ${W}: ${z.message}`)}let Y={};for(let z of Q.replace(/^\uFEFF/,"").split(/\r?\n/)){let G=z.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);if(!G)continue;let[,Z,F]=G,U=F.trim(),X=U[0],K=X==='"'||X==="'"||X==="`"?U.lastIndexOf(X):-1,$=K>0?U.slice(1,K):U.replace(/\s+#.*$/,"").trim();if(X==='"'&&K>0)$=$.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\"/g,'"').replace(/\\\\/g,"\\");Y[Z]=$}for(let z of PG)if(!process.env[z]?.trim()&&Y[z]!==void 0)process.env[z]=Y[z]}function h(J,W){return E.relative(b6(J),W)}function s8(J,W,Q){if(!W.trim())throw Error("file must be a non-empty path");if(E.isAbsolute(W))throw Error("absolute paths are not allowed; use a workspace-relative path");let Y=b6(J),z=E.resolve(Y,W),G=E.relative(Y,z),Z=String.fromCharCode(46).repeat(2);if(!G||G===Z||G.startsWith(Z+E.sep)||E.isAbsolute(G))throw Error("file must resolve to a file inside the current workspace");let F=z.toLowerCase();if(!Q.some((U)=>F.endsWith(U)))throw Error(`unsupported file extension; expected ${Q.join(" or ")}`);return z}function P5(J,W){return s8(J,W,s9)}async function C5(J){let W=await I.stat(J);if(!W.isFile())throw Error("target is not a regular file");if(W.size>X6)throw Error(`file is larger than the ${X6/1024/1024} MB MVP limit`);return I.readFile(J,"utf8")}function J1(J){let W=Buffer.from(J.trim(),"base64"),Q=new TextDecoder().decode(HJ.inflateRaw(W));return decodeURIComponent(Q)}function Q1(J){let W=encodeURIComponent(J),Q=HJ.deflateRaw(new TextEncoder().encode(W));return Buffer.from(Q).toString("base64")}function CG(J){let W=J.mxGeometry;if(!W||typeof W!=="object")return;let Q=W,z=_5(Q.Array).filter((U)=>S(U["@_as"])==="points").flatMap((U)=>_5(U.mxPoint)).map((U)=>({x:t(U["@_x"]),y:t(U["@_y"])})).filter((U)=>U.x!==void 0&&U.y!==void 0),G=_5(Q.mxPoint).find((U)=>S(U["@_as"])==="offset"),Z=G?t(G["@_x"]):void 0,F=G?t(G["@_y"]):void 0;return{x:t(Q["@_x"]),y:t(Q["@_y"]),width:t(Q["@_width"]),height:t(Q["@_height"]),relative:S(Q["@_relative"])==="1",offset:Z!==void 0||F!==void 0?{x:Z||0,y:F||0}:void 0,points:z}}function $J(J){let W=k8.validate(J);if(W!==!0)throw Error(`invalid mxGraphModel XML: ${JSON.stringify(W)}`);let z=K6.parse(J).mxGraphModel?.root;if(!z)throw Error("diagram page does not contain mxGraphModel/root");return _5(z.mxCell).map((G)=>({id:S(G["@_id"])||"",parent:S(G["@_parent"]),source:S(G["@_source"]),target:S(G["@_target"]),label:S(G["@_value"]),style:S(G["@_style"]),vertex:S(G["@_vertex"])==="1",edge:S(G["@_edge"])==="1",geometry:CG(G)}))}function qJ(J){let Q=K6.parse(J).mxGraphModel;return{background:S(Q?.["@_background"])||""}}function f(J){let W=k8.validate(J);if(W!==!0)throw Error(`invalid draw.io XML: ${JSON.stringify(W)}`);let Q=K6.parse(J);if(Q.mxGraphModel)return[{id:"page-1",name:"Page-1",compressed:!1,properties:qJ(J),cells:$J(J)}];let Y=Q.mxfile;if(!Y)throw Error("root element must be mxfile or mxGraphModel");let z=_5(Y.diagram);if(z.length===0)throw Error("mxfile contains no diagram pages");return z.map((G,Z)=>{let F=S(G["@_id"])||`page-${Z+1}`,U=S(G["@_name"])||`Page-${Z+1}`,X=G.mxGraphModel;if(X&&typeof X==="object"){let H=D6.build({mxGraphModel:X});return{id:F,name:U,compressed:!1,properties:qJ(H),cells:$J(H)}}let K=S(G["#text"]);if(!K?.trim())throw Error(`page ${U} has no diagram data`);let $=J1(K);return{id:F,name:U,compressed:!0,properties:qJ($),cells:$J($)}})}function Z6(J){let W=k8.validate(J);if(W!==!0)throw Error(`invalid draw.io XML: ${JSON.stringify(W)}`);let Q=K6.parse(J);if(Q.mxGraphModel&&typeof Q.mxGraphModel==="object")return{document:Q,directModel:!0,pages:[{id:"page-1",name:"Page-1",compressed:!1,diagram:null,model:Q.mxGraphModel}]};let Y=Q.mxfile;if(!Y)throw Error("root element must be mxfile or mxGraphModel");let z=_5(Y.diagram);if(z.length===0)throw Error("mxfile contains no diagram pages");let G=z.map((Z,F)=>{let U={id:S(Z["@_id"])||`page-${F+1}`,name:S(Z["@_name"])||`Page-${F+1}`,compressed:!1,diagram:Z,model:{}};if(Z.mxGraphModel&&typeof Z.mxGraphModel==="object")return U.model=Z.mxGraphModel,U;let X=S(Z["#text"]);if(!X?.trim())throw Error(`page ${U.name} has no diagram data`);let K=K6.parse(J1(X));if(!K.mxGraphModel||typeof K.mxGraphModel!=="object")throw Error(`page ${U.name} has no mxGraphModel`);return U.compressed=!0,U.model=K.mxGraphModel,U});return{document:Q,directModel:!1,pages:G}}function V8(J){if(J.directModel)return J.document.mxGraphModel=J.pages[0].model,`${D6.build(J.document)}
`;for(let W of J.pages){let Q=W.diagram;if(W.compressed)delete Q.mxGraphModel,Q["#text"]=Q1(D6.build({mxGraphModel:W.model}));else delete Q["#text"],Q.mxGraphModel=W.model}return`${D6.build(J.document)}
`}function F6(J){let W=J.model.root;if(!W)throw Error(`page ${J.name} has no mxGraphModel/root`);let Q=_5(W.mxCell);return W.mxCell=Q,Q}function _9(J,W){if(!W?.trim())return J.pages[0];let Q=J.pages.find((Y)=>Y.id===W||Y.name===W);if(!Q)throw Error(`diagram page not found: ${W}`);return Q}function U5(J){return S(J["@_id"])||""}function m5(J){return S(J["@_vertex"])==="1"}function n8(J){return S(J["@_edge"])==="1"}function p5(J){if(!J.mxGeometry||typeof J.mxGeometry!=="object")J.mxGeometry={"@_as":"geometry"};return J.mxGeometry}function AG(J){let W=J.filter(m5);if(W.length===0)return{x:80,y:80};let Q=80;for(let Y of W){let z=p5(Y),G=t(z["@_y"])||0,Z=t(z["@_height"])||70;Q=Math.max(Q,G+Z)}return{x:80,y:Q+60}}var RG={font_size:"fontSize",font_family:"fontFamily",font_color:"fontColor",fill_color:"fillColor",stroke_color:"strokeColor",stroke_width:"strokeWidth",opacity:"opacity",rounded:"rounded",dashed:"dashed"};function W1(J){return(J||"").split(";").map((W)=>W.trim()).filter(Boolean).map((W)=>{let Q=W.indexOf("=");return Q<0?[W,""]:[W.slice(0,Q),W.slice(Q+1)]})}function TG(J){return Object.fromEntries(W1(J).toSorted(([W],[Q])=>W.localeCompare(Q)))}function m8(J,W){if(!W)return J||"";let Q=W1(J),Y=new Map(Q);for(let[Z,F]of Object.entries(RG)){let U=W[Z];if(U===void 0)continue;if(typeof U==="string"&&(!U.trim()||/[;=\r\n]/.test(U)))throw Error(`style_updates.${Z} contains an unsafe Draw.io style delimiter`);Y.set(F,typeof U==="boolean"?U?"1":"0":String(U))}let z=new Set,G=[];for(let[Z]of Q){if(z.has(Z))continue;z.add(Z);let F=Y.get(Z)||"";G.push(`${Z}${F===""?"":`=${F}`}`)}for(let[Z,F]of Y){if(z.has(Z))continue;G.push(`${Z}${F===""?"":`=${F}`}`)}return G.length>0?`${G.join(";")};`:""}function EG(J,W){let Q=F6(J),Y=[],z=(G)=>Q.find((Z)=>U5(Z)===G);for(let G of W){if(!TJ.test(G.id)||G.id==="0"||G.id==="1")throw Error(`invalid or reserved operation id: ${G.id}`);let Z=z(G.id);if(G.type==="add-node"){if(Z)throw Error(`cell already exists: ${G.id}`);if(!G.label?.trim())throw Error(`add-node ${G.id} requires label`);let F=AG(Q);Q.push({"@_id":G.id,"@_value":G.label,"@_style":m8(EJ(G.kind),G.style_updates),"@_vertex":"1","@_parent":"1",mxGeometry:{"@_x":G.x??F.x,"@_y":G.y??F.y,"@_width":G.width??(G.kind==="decision"?140:160),"@_height":G.height??(G.kind==="decision"?100:70),"@_as":"geometry"}}),Y.push(G.id);continue}if(G.type==="add-edge"){if(Z)throw Error(`cell already exists: ${G.id}`);if(!G.source||!z(G.source)||!m5(z(G.source)))throw Error(`add-edge ${G.id} has unknown vertex source: ${G.source||"(empty)"}`);if(!G.target||!z(G.target)||!m5(z(G.target)))throw Error(`add-edge ${G.id} has unknown vertex target: ${G.target||"(empty)"}`);Q.push({"@_id":G.id,"@_value":G.label||"","@_style":m8(kJ,G.style_updates),"@_edge":"1","@_parent":"1","@_source":G.source,"@_target":G.target,mxGeometry:{"@_relative":"1","@_as":"geometry"}}),Y.push(G.id);continue}if(!Z)throw Error(`cell not found: ${G.id}`);if(G.type==="update-node"){if(!m5(Z))throw Error(`${G.id} is not a node`);if(G.label!==void 0)Z["@_value"]=G.label;if(G.kind!==void 0)Z["@_style"]=EJ(G.kind);if(G.style_updates!==void 0)Z["@_style"]=m8(S(Z["@_style"]),G.style_updates);let F=p5(Z);if(G.x!==void 0)F["@_x"]=G.x;if(G.y!==void 0)F["@_y"]=G.y;if(G.width!==void 0)F["@_width"]=G.width;if(G.height!==void 0)F["@_height"]=G.height;Y.push(G.id);continue}if(G.type==="update-edge"){if(!n8(Z))throw Error(`${G.id} is not an edge`);if(G.source!==void 0){let F=z(G.source);if(!F||!m5(F))throw Error(`update-edge ${G.id} has unknown vertex source: ${G.source}`);Z["@_source"]=G.source}if(G.target!==void 0){let F=z(G.target);if(!F||!m5(F))throw Error(`update-edge ${G.id} has unknown vertex target: ${G.target}`);Z["@_target"]=G.target}if(G.label!==void 0)Z["@_value"]=G.label;if(G.style_updates!==void 0)Z["@_style"]=m8(S(Z["@_style"]),G.style_updates);Y.push(G.id);continue}if(G.type==="remove-edge"){if(!n8(Z))throw Error(`${G.id} is not an edge`);Q.splice(Q.indexOf(Z),1),Y.push(G.id);continue}if(G.type==="remove-node"){if(!m5(Z))throw Error(`${G.id} is not a node`);let F=Q.filter((U)=>n8(U)&&(S(U["@_source"])===G.id||S(U["@_target"])===G.id));if(F.length>0&&!G.cascade)throw Error(`remove-node ${G.id} has ${F.length} connected edge(s); set cascade=true`);for(let U of F)Y.push(U5(U)),Q.splice(Q.indexOf(U),1);Q.splice(Q.indexOf(Z),1),Y.push(G.id)}}return[...new Set(Y)]}function x9(J){let W=new Map;for(let Q of J)for(let Y of Q.cells)if(Y.vertex||Y.edge)W.set(`${Q.id}:${Y.id}`,Y);return W}function d5(J){return{label:J.label||"",parent:J.parent||"",source:J.source||"",target:J.target||"",style:TG(J.style),geometry:J.geometry||{}}}function w6(J,W){let Q=x9(J),Y=x9(W),z=[],G=[],Z=[],F=[];for(let[K,$]of Y){if(!Q.has(K)){z.push({key:K,cell:$});continue}let H=d5(Q.get(K)),q=d5($);if(JSON.stringify(H)!==JSON.stringify(q)){let V=Object.keys(q).filter((M)=>JSON.stringify(H[M])!==JSON.stringify(q[M])),B=[...new Set([...Object.keys(H.style),...Object.keys(q.style)])].filter((M)=>H.style[M]!==q.style[M]).sort().map((M)=>({property:M,before:H.style[M]??null,after:q.style[M]??null})),j=[...new Set([...Object.keys(H.geometry),...Object.keys(q.geometry)])].filter((M)=>JSON.stringify(H.geometry[M])!==JSON.stringify(q.geometry[M])).sort().map((M)=>({property:M,before:H.geometry[M]??null,after:q.geometry[M]??null})),P=K.slice(0,Math.max(0,K.length-$.id.length-1));Z.push({key:K,pageId:P,cellId:$.id,kind:$.edge?"edge":"node",changedFields:V,styleChanges:B,geometryChanges:j,labelChange:H.label!==q.label?{before:H.label,after:q.label}:null,before:H,after:q})}}for(let[K,$]of Q)if(!Y.has(K))G.push({key:K,cell:$});let U=new Map(J.map((K)=>[K.id,K])),X=new Map(W.map((K)=>[K.id,K]));for(let K of new Set([...U.keys(),...X.keys()])){let $=U.get(K),H=X.get(K),q=H?.name||$?.name||K;if(!$||!H){F.push({pageId:K,pageName:q,property:"page",before:$?"present":null,after:H?"present":null});continue}if($.name!==H.name)F.push({pageId:K,pageName:q,property:"name",before:$.name,after:H.name});if($.properties.background!==H.properties.background)F.push({pageId:K,pageName:q,property:"background",before:$.properties.background||null,after:H.properties.background||null})}return{added:z,removed:G,changed:Z,pageChanges:F,summary:{added:z.length,removed:G.length,changed:Z.length,pagesChanged:new Set(F.map((K)=>K.pageId)).size,unchanged:[...Y.keys()].filter((K)=>Q.has(K)&&JSON.stringify(d5(Q.get(K)))===JSON.stringify(d5(Y.get(K)))).length}}}function t8(J){if(Array.isArray(J))return J.map(t8);if(!J||typeof J!=="object")return J;return Object.fromEntries(Object.entries(J).sort(([W],[Q])=>W.localeCompare(Q)).map(([W,Q])=>[W,t8(Q)]))}function k6(J){return J===void 0?"<missing>":JSON.stringify(t8(J))}function Y1(J,W,Q,Y=[]){let z=k6(J),G=k6(W),Z=k6(Q);if(G===Z)return{userValue:W,agentValue:W,conflicts:[]};if(G===z)return{userValue:Q,agentValue:Q,conflicts:[]};if(Z===z)return{userValue:W,agentValue:W,conflicts:[]};if(e(J)&&e(W)&&e(Q)){let F={},U={},X=[],K=new Set([...Object.keys(J),...Object.keys(W),...Object.keys(Q)]);for(let $ of K){let H=Y1(J[$],W[$],Q[$],[...Y,$]);if(H.userValue!==void 0)F[$]=H.userValue;if(H.agentValue!==void 0)U[$]=H.agentValue;X.push(...H.conflicts)}return{userValue:F,agentValue:U,conflicts:X}}return{userValue:W,agentValue:Q,conflicts:[{path:Y.join(".")||"existence",user:{exists:W!==void 0,value:W},agent:{exists:Q!==void 0,value:Q}}]}}function VJ(J){let W=new Map;for(let Q of F6(J)){let Y=S(Q["@_id"]);if(!Y)throw Error(`page ${J.name} contains a cell without a stable id`);if(W.has(Y))throw Error(`page ${J.name} contains duplicate cell id ${Y}`);W.set(Y,Q)}return W}function LJ(J){if(!J)return{exists:!1,kind:"cell",label:"",style:"",parent:null,source:null,target:null,geometry:null};let W=e(J.mxGeometry)?J.mxGeometry:null;return{exists:!0,kind:S(J["@_vertex"])==="1"?"node":S(J["@_edge"])==="1"?"edge":"cell",label:S(J["@_value"]),style:S(J["@_style"]),parent:S(J["@_parent"])||null,source:S(J["@_source"])||null,target:S(J["@_target"])||null,geometry:W?{x:S(W["@_x"])||null,y:S(W["@_y"])||null,width:S(W["@_width"])||null,height:S(W["@_height"])||null}:null}}function BJ(J){let W=J.diagram?Object.fromEntries(Object.entries(J.diagram).filter(([z])=>z!=="mxGraphModel"&&z!=="#text")):null,Q=Object.fromEntries(Object.entries(J.model).filter(([z])=>!["root","@_dx","@_dy"].includes(z))),Y=J.model.root&&typeof J.model.root==="object"?Object.fromEntries(Object.entries(J.model.root).filter(([z])=>z!=="mxCell")):null;return JSON.stringify(t8({diagram:W,model:Q,root:Y}))}function h9(J,W,Q,Y,z){let G=F6(J.get(Q)),Z=G.findIndex(($)=>S($["@_id"])===Y);if(z===void 0){if(Z>=0)G.splice(Z,1);return}if(Z>=0){G[Z]=structuredClone(z);return}let F=F6(W.get(Q)).map(($)=>S($["@_id"])),U=F.indexOf(Y),X=[...F.slice(0,U)].reverse().find(($)=>G.some((H)=>S(H["@_id"])===$)),K=F.slice(U+1).find(($)=>G.some((H)=>S(H["@_id"])===$));if(X){let $=G.findIndex((H)=>S(H["@_id"])===X);G.splice($+1,0,structuredClone(z))}else if(K){let $=G.findIndex((H)=>S(H["@_id"])===K);G.splice($,0,structuredClone(z))}else G.push(structuredClone(z))}function wG(J,W,Q){try{let Y=Z6(J),z=Z6(W),G=Z6(Q);if(Y.directModel!==z.directModel||Y.directModel!==G.directModel)return{status:"unavailable",reason:"document container structure changed"};let Z=new Map(Y.pages.map((A)=>[A.id,A])),F=new Map(z.pages.map((A)=>[A.id,A])),U=new Map(G.pages.map((A)=>[A.id,A])),X=[...Z.keys()].sort();if(JSON.stringify([...F.keys()].sort())!==JSON.stringify(X)||JSON.stringify([...U.keys()].sort())!==JSON.stringify(X))return{status:"unavailable",reason:"page additions or removals require user confirmation"};let K=Y.pages.map((A)=>A.id),$=z.pages.map((A)=>A.id),H=G.pages.map((A)=>A.id);if(JSON.stringify($)!==JSON.stringify(K)&&JSON.stringify($)!==JSON.stringify(H))return{status:"unavailable",reason:"local page order changed"};let q=[],V=[],L=[],B=[],O=[];for(let A of X){let R=Z.get(A),_=F.get(A),V5=U.get(A),y=BJ(R),i=BJ(_),u=BJ(V5);if(i!==y&&i!==u)return{status:"unavailable",reason:`local page metadata changed for ${A}`};let L5=VJ(R),n=VJ(_),s=VJ(V5),$6=new Set([...L5.keys()].filter((p)=>n.has(p)&&s.has(p))),y1=[...L5.keys()].filter((p)=>$6.has(p)),gJ=[...n.keys()].filter((p)=>$6.has(p)),b1=[...s.keys()].filter((p)=>$6.has(p));if(JSON.stringify(gJ)!==JSON.stringify(y1)&&JSON.stringify(gJ)!==JSON.stringify(b1))return{status:"unavailable",reason:`local cell order changed for page ${A}`};let f1=new Set([...L5.keys(),...n.keys(),...s.keys()]);for(let p of f1){let f6=`${A}:${p}`,cJ=k6(L5.get(p)),v1=k6(n.get(p)),_1=k6(s.get(p)),x1=v1!==cJ,h1=_1!==cJ;if(x1)q.push(f6);if(h1)V.push(f6);let v6=Y1(L5.get(p),n.get(p),s.get(p));if(O.push({key:f6,pageId:A,cellId:p,userCell:v6.userValue,agentCell:v6.agentValue}),v6.conflicts.length>0){L.push(f6);let u1=LJ(L5.get(p)),g1=LJ(n.get(p)),c1=LJ(s.get(p));B.push({key:f6,pageId:A,pageName:R.name,cellId:p,changedFields:v6.conflicts.map((m1)=>m1.path),fields:v6.conflicts,base:u1,user:g1,agent:c1})}}}let j=structuredClone(G),P=structuredClone(G),M=new Map(j.pages.map((A)=>[A.id,A])),T=new Map(P.pages.map((A)=>[A.id,A]));for(let A of O)h9(M,F,A.pageId,A.cellId,A.userCell),h9(T,F,A.pageId,A.cellId,A.agentCell);let w=V8(j),C=V8(P),D=l(f(w)),N=l(f(C));if(!D.valid||!N.valid)return{status:"unavailable",reason:`merged diagram is invalid: ${[...D.errors,...N.errors].join("; ")}`};if(L.length>0)return{status:"conflict",conflicts:L,details:B,userResolutionXml:w,agentResolutionXml:C,localChangedKeys:q,remoteChangedKeys:V};return{status:"merged",xml:w,localChangedKeys:q,remoteChangedKeys:V}}catch(Y){return{status:"unavailable",reason:`automatic merge failed: ${Y.message}`}}}function NG(J,W){if(J.length===0)throw Error("nodes must contain at least one node");let Q=new Set;for(let z of J){if(!TJ.test(z.id)||z.id==="0"||z.id==="1")throw Error(`invalid or reserved node id: ${z.id}`);if(!z.label.trim())throw Error(`node ${z.id} has an empty label`);if(Q.has(z.id))throw Error(`duplicate node id: ${z.id}`);Q.add(z.id)}let Y=new Set;for(let[z,G]of W.entries()){let Z=G.id||`edge-${z+1}`;if(!TJ.test(Z)||Z==="0"||Z==="1")throw Error(`invalid or reserved edge id: ${Z}`);if(Y.has(Z)||Q.has(Z))throw Error(`duplicate cell id: ${Z}`);if(!Q.has(G.source))throw Error(`edge ${Z} has unknown source: ${G.source}`);if(!Q.has(G.target))throw Error(`edge ${Z} has unknown target: ${G.target}`);Y.add(Z)}}function G1(J,W){let Q=new Map(J.map((F)=>[F.id,0])),Y=new Map(J.map((F)=>[F.id,[]])),z=new Map(J.map((F)=>[F.id,0]));for(let F of W)Q.set(F.target,(Q.get(F.target)||0)+1),Y.get(F.source)?.push(F.target);let G=J.filter((F)=>Q.get(F.id)===0).map((F)=>F.id),Z=new Set;while(G.length>0){let F=G.shift();if(Z.has(F))continue;Z.add(F);for(let U of Y.get(F)||[])if(z.set(U,Math.max(z.get(U)||0,(z.get(F)||0)+1)),Q.set(U,(Q.get(U)||1)-1),Q.get(U)===0)G.push(U)}return z}function EJ(J){return"rounded=1;whiteSpace=wrap;html=1;arcSize=12;strokeWidth=1.5;"+{default:"fillColor=#dae8fc;strokeColor=#6c8ebf;",application:"fillColor=#d5e8d4;strokeColor=#82b366;",service:"fillColor=#dae8fc;strokeColor=#6c8ebf;",database:"shape=cylinder3;boundedLbl=1;backgroundOutline=1;fillColor=#fff2cc;strokeColor=#d6b656;",external:"dashed=1;fillColor=#f5f5f5;strokeColor=#666666;",decision:"rhombus;fillColor=#ffe6cc;strokeColor=#d79b00;"}[J||"default"]}function DG(J,W,Q){let Y=G1(J,W),z=new Map,G=Math.max(1,...J.map(($)=>W.filter((H)=>H.source===$.id).length)),Z=Math.max(240,200+G*20),F=140,U=new Map;for(let $ of J){let H=Y.get($.id)||0,q=z.get(H)||[];q.push($),z.set(H,q)}for(let $ of J){let H=Y.get($.id)||0,q=(z.get(H)||[]).findIndex((B)=>B.id===$.id),V=$.kind==="decision"?140:160,L=$.kind==="decision"?100:70;U.set($.id,{x:Q==="left-to-right"?80+H*Z:80+q*Z,y:Q==="left-to-right"?80+q*140:80+H*140,width:V,height:L})}let X=J.map(($)=>{let H=U.get($.id);return`      <mxCell id="${S5($.id)}" value="${S5($.label)}" style="${S5(EJ($.kind))}" vertex="1" parent="1">
        <mxGeometry x="${H.x}" y="${H.y}" width="${H.width}" height="${H.height}" as="geometry"/>
      </mxCell>`}),K=W.map(($,H)=>{let q=$.id||`edge-${H+1}`,V=U.get($.source),L=U.get($.target),B=W.filter((T)=>T.source===$.source),O=B.indexOf($),j=(O-(B.length-1)/2)*18,P=kJ,M;if(Q==="left-to-right"){let T=V.x+V.width,w=L.x,C=w>T?(T+w)/2+j:Math.max(T,L.x+L.width)+80+O*18,D=V.y+V.height/2,N=L.y+L.height/2;P+="exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;",M=`          <mxPoint x="${C}" y="${D}"/>
          <mxPoint x="${C}" y="${N}"/>`}else{let T=V.y+V.height,w=L.y,C=w>T?(T+w)/2+j:Math.max(T,L.y+L.height)+80+O*18,D=V.x+V.width/2,N=L.x+L.width/2;P+="exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;",M=`          <mxPoint x="${D}" y="${C}"/>
          <mxPoint x="${N}" y="${C}"/>`}return`      <mxCell id="${S5(q)}" value="${S5($.label||"")}" style="${P}" edge="1" parent="1" source="${S5($.source)}" target="${S5($.target)}">
        <mxGeometry relative="1" as="geometry">
          <Array as="points">
${M}
          </Array>
        </mxGeometry>
      </mxCell>`});return`<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
${[...X,...K].join(`
`)}
  </root>
</mxGraphModel>`}function u9(J,W,Q,Y,z){let G=DG(W,Q,Y),Z=`page-${e9(J)}`,F=z?Q1(G):G;return`<mxfile host="OpenWork" modified="${new Date().toISOString()}" agent="drawio-expert" version="26.0.0">
  <diagram id="${S5(Z)}" name="${S5(J)}">${F}</diagram>
</mxfile>
`}function l(J){let W=[],Q=[];for(let Y of J){let z=new Set;for(let Z of Y.cells){if(!Z.id){W.push(`${Y.name}: cell without id`);continue}if(z.has(Z.id))W.push(`${Y.name}: duplicate cell id ${Z.id}`);z.add(Z.id)}for(let Z of Y.cells){if(Z.parent&&!z.has(Z.parent))W.push(`${Y.name}: ${Z.id} references missing parent ${Z.parent}`);if(Z.edge){if(!Z.source||!z.has(Z.source))W.push(`${Y.name}: edge ${Z.id} has missing source ${Z.source||"(empty)"}`);if(!Z.target||!z.has(Z.target))W.push(`${Y.name}: edge ${Z.id} has missing target ${Z.target||"(empty)"}`)}if(Z.vertex){if(!Z.geometry)W.push(`${Y.name}: vertex ${Z.id} has no geometry`);else if(Z.geometry.width!==void 0&&Z.geometry.width<=0||Z.geometry.height!==void 0&&Z.geometry.height<=0)W.push(`${Y.name}: vertex ${Z.id} has non-positive dimensions`);if(!Z.label?.trim())Q.push(`${Y.name}: vertex ${Z.id} has an empty label`)}}let G=Y.cells.filter((Z)=>Z.vertex&&Z.geometry?.x!==void 0&&Z.geometry?.y!==void 0&&Z.geometry?.width!==void 0&&Z.geometry?.height!==void 0);for(let Z=0;Z<G.length;Z+=1){let F=G[Z];for(let U=Z+1;U<G.length;U+=1){let X=G[U];if(F.parent!==X.parent)continue;let K=F.geometry,$=X.geometry;if(K.x<$.x+$.width&&K.x+K.width>$.x&&K.y<$.y+$.height&&K.y+K.height>$.y)Q.push(`${Y.name}: nodes ${F.id} and ${X.id} overlap`)}}}return{valid:W.length===0,errors:W,warnings:Q,stats:{pages:J.length,nodes:J.reduce((Y,z)=>Y+z.cells.filter((G)=>G.vertex).length,0),edges:J.reduce((Y,z)=>Y+z.cells.filter((G)=>G.edge).length,0)}}}function S6(J){return{cellsById:new Map(J.map((W)=>[W.id,W])),absoluteGeometry:new Map}}function SJ(J,W,Q=new Set){if(W.absoluteGeometry.has(J.id))return W.absoluteGeometry.get(J.id)||null;let Y=J.geometry;if(!Y)return W.absoluteGeometry.set(J.id,null),null;if(Q.has(J.id))return null;Q.add(J.id);let z=J.parent?W.cellsById.get(J.parent):void 0,G=z?SJ(z,W,Q):null,Z=Y.x||0,F=Y.y||0,U=Z,X=F;if(G)if(Y.relative)U=G.x+Z*G.width+(Y.offset?.x||0),X=G.y+F*G.height+(Y.offset?.y||0);else U=G.x+Z,X=G.y+F;let K={x:U,y:X,width:Y.width||0,height:Y.height||0};return Q.delete(J.id),W.absoluteGeometry.set(J.id,K),K}function q5(J,W){let Q=J.geometry;if(Q?.x===void 0||Q.y===void 0||Q.width===void 0||Q.height===void 0)return null;let Y=SJ(J,W);if(!Y)return null;return{...Y,width:Q.width,height:Q.height}}function jJ(J){return{x:J.x+J.width/2,y:J.y+J.height/2}}function MJ(J,W){return J.x<W.x+W.width&&J.x+J.width>W.x&&J.y<W.y+W.height&&J.y+J.height>W.y}function z1(J,W){return J?.split(";").map((Q)=>Q.split("=",2)).find(([Q])=>Q===W)?.[1]}function e8(J,W){let Q=z1(J,W);if(Q===void 0)return;let Y=Number(Q);return Number.isFinite(Y)?Y:void 0}function kG(J){let W=J.replace(/<br\s*\/?\s*>/gi,`
`).replace(/&#x0*a;|&#0*10;/gi,`
`).replace(/<[^>]+>/g,"").replace(/&nbsp;|&#0*160;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').trim();return W?W.split(/\r?\n/):[]}function SG(J,W,Q){let Y=kG(J);if(Y.length===0)return null;let z=(F)=>Array.from(F).reduce((U,X)=>{if(/\s/u.test(X))return U+Q*0.35;if(/[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/u.test(X))return U+Q;if(/[A-Z0-9]/u.test(X))return U+Q*0.65;if(/[a-z]/u.test(X))return U+Q*0.55;return U+Q*0.45},0),G=Math.max(8,...Y.map(z))+8,Z=Math.max(Q*1.25,Y.length*Q*1.25)+4;return{x:W.x-G/2,y:W.y-Z/2,width:G,height:Z}}function IG(J,W){let Q=J.slice(0,-1).map((Z,F)=>{let U=J[F+1];return{start:Z,end:U,length:Math.hypot(U.x-Z.x,U.y-Z.y)}}).filter((Z)=>Z.length>0.000000001),Y=Q.reduce((Z,F)=>Z+F.length,0);if(Y<=0.000000001)return null;let z=Math.min(1,Math.max(0,W))*Y;for(let Z of Q){if(z<=Z.length){let F=z/Z.length;return{point:{x:Z.start.x+(Z.end.x-Z.start.x)*F,y:Z.start.y+(Z.end.y-Z.start.y)*F},tangent:{x:(Z.end.x-Z.start.x)/Z.length,y:(Z.end.y-Z.start.y)/Z.length}}}z-=Z.length}let G=Q[Q.length-1];return{point:{...G.end},tangent:{x:(G.end.x-G.start.x)/G.length,y:(G.end.y-G.start.y)/G.length}}}function yG(J,W){if(!J.label?.trim())return null;let Q=Math.min(1,Math.max(-1,J.geometry?.x||0)),Y=IG(W,(Q+1)/2);if(!Y)return null;let z=J.geometry?.y||0,G={x:Y.point.x-Y.tangent.y*z+(J.geometry?.offset?.x||0),y:Y.point.y+Y.tangent.x*z+(J.geometry?.offset?.y||0)};return SG(J.label,G,e8(J.style,"fontSize")||12)}function bG(J,W){if(!J.label?.trim())return null;let Q=q5(J,W);if(!Q)return null;if(!J.style?.split(";").includes("swimlane"))return Q;let Y=Math.max(0,e8(J.style,"startSize")||23);if(z1(J.style,"horizontal")==="0")return{...Q,width:Math.min(Q.width,Y)};return{...Q,height:Math.min(Q.height,Y)}}function U1(J,W,Q){let Y=J.source?W.get(J.source):void 0,z=J.target?W.get(J.target):void 0,G=Y?q5(Y,Q):null,Z=z?q5(z,Q):null;if(!G||!Z)return null;let F=jJ(G),U=jJ(Z),X=(B,O,j,P)=>{let M=e8(J.style,j),T=e8(J.style,P);if(M!==void 0||T!==void 0)return{x:B.x+(M??0.5)*B.width,y:B.y+(T??0.5)*B.height};let w=jJ(B),C=O.x-w.x,D=O.y-w.y;if(Math.abs(C)>=Math.abs(D))return{x:C>=0?B.x+B.width:B.x,y:w.y};return{x:w.x,y:D>=0?B.y+B.height:B.y}},K=X(G,U,"exitX","exitY"),$=X(Z,F,"entryX","entryY"),H=J.parent?Q.cellsById.get(J.parent):void 0,q=H?SJ(H,Q):null,V=(J.geometry?.points||[]).map((B)=>({x:B.x+(q?.x||0),y:B.y+(q?.y||0)}));if(V.length>0)return[K,...V,$];if(J.style?.includes("edgeStyle=none"))return[K,$];if(Math.abs($.x-K.x)>=Math.abs($.y-K.y)){let B=(K.x+$.x)/2;return[K,{x:B,y:K.y},{x:B,y:$.y},$]}let L=(K.y+$.y)/2;return[K,{x:K.x,y:L},{x:$.x,y:L},$]}function g9(J,W){let Q=new Set,Y=J?W.cellsById.get(J):void 0;while(Y?.parent&&!Q.has(Y.parent))Q.add(Y.parent),Y=W.cellsById.get(Y.parent);return Q}function fG(J,W,Q,Y){let z=(W.x-J.x)*(Y.y-Q.y)-(W.y-J.y)*(Y.x-Q.x);if(Math.abs(z)<0.000000001)return!1;let G=((Q.x-J.x)*(Y.y-Q.y)-(Q.y-J.y)*(Y.x-Q.x))/z,Z=((Q.x-J.x)*(W.y-J.y)-(Q.y-J.y)*(W.x-J.x))/z,F=0.000001;return G>F&&G<1-F&&Z>F&&Z<1-F}function vG(J,W,Q){let z=Q.x+0.0001,G=Q.x+Q.width-0.0001,Z=Q.y+0.0001,F=Q.y+Q.height-0.0001;if(z>=G||Z>=F)return!1;let U=W.x-J.x,X=W.y-J.y,K=[-U,U,-X,X],$=[J.x-z,G-J.x,J.y-Z,F-J.y],H=0,q=1;for(let V=0;V<K.length;V+=1){if(Math.abs(K[V])<0.000000001){if($[V]<0)return!1;continue}let L=$[V]/K[V];if(K[V]<0)H=Math.max(H,L);else q=Math.min(q,L);if(H>q)return!1}return q-H>0.0001}function p8(J,W=90){let Q=l(J),Y=Q.errors.map((Z)=>({code:"invalid-structure",severity:"error",page:Z.split(":")[0]||"(unknown)",cells:[],message:Z})),z={overlaps:0,edgeNodeIntersections:0,edgeCrossings:0,labelOverlaps:0,emptyLabels:0,missingLineJumps:0};for(let Z of J){let F=Z.cells.filter((L)=>L.vertex),U=Z.cells.filter((L)=>L.edge),X=new Map(F.map((L)=>[L.id,L])),K=S6(Z.cells),$=new Set(Z.cells.map((L)=>L.parent).filter((L)=>Boolean(L)));for(let L=0;L<F.length;L+=1){let B=F[L],O=q5(B,K);if(!B.label?.trim()&&!$.has(B.id))z.emptyLabels+=1,Y.push({code:"empty-label",severity:"warning",page:Z.name,cells:[B.id],message:`${Z.name}: node ${B.id} has an empty label`});if(!O)continue;for(let j=L+1;j<F.length;j+=1){let P=F[j];if(B.parent!==P.parent)continue;let M=q5(P,K);if(!M||!MJ(O,M))continue;z.overlaps+=1,Y.push({code:"node-overlap",severity:"error",page:Z.name,cells:[B.id,P.id],message:`${Z.name}: nodes ${B.id} and ${P.id} overlap`})}}let H=new Map,q=new Map;for(let L of U){let B=U1(L,X,K);if(B){H.set(L.id,B);let j=yG(L,B);if(j)q.set(L.id,j)}if(!L.style?.includes("jumpStyle=arc"))z.missingLineJumps+=1,Y.push({code:"missing-line-jump",severity:"info",page:Z.name,cells:[L.id],message:`${Z.name}: edge ${L.id} does not enable arc line jumps`});if(!B)continue;let O=new Set([...g9(L.source,K),...g9(L.target,K)]);for(let j of F){if(j.id===L.source||j.id===L.target)continue;if(O.has(j.id))continue;let P=q5(j,K);if(!P)continue;if(!B.slice(0,-1).some((T,w)=>vG(T,B[w+1],P)))continue;z.edgeNodeIntersections+=1,Y.push({code:"edge-through-node",severity:"error",page:Z.name,cells:[L.id,j.id],message:`${Z.name}: edge ${L.id} passes through node ${j.id}`})}}for(let L of U){let B=q.get(L.id);if(!B)continue;for(let O of F){let j=bG(O,K);if(!j||!MJ(B,j))continue;z.labelOverlaps+=1,Y.push({code:"label-overlap",severity:"error",page:Z.name,cells:[L.id,O.id],message:`${Z.name}: label of edge ${L.id} overlaps node or container title ${O.id}`})}}let V=U.filter((L)=>q.has(L.id));for(let L=0;L<V.length;L+=1){let B=V[L],O=q.get(B.id);for(let j=L+1;j<V.length;j+=1){let P=V[j],M=q.get(P.id);if(!MJ(O,M))continue;z.labelOverlaps+=1,Y.push({code:"label-overlap",severity:"error",page:Z.name,cells:[B.id,P.id],message:`${Z.name}: labels of edges ${B.id} and ${P.id} overlap`})}}for(let L=0;L<U.length;L+=1){let B=U[L],O=H.get(B.id);if(!O)continue;for(let j=L+1;j<U.length;j+=1){let P=U[j];if(B.source===P.source||B.source===P.target||B.target===P.source||B.target===P.target)continue;let M=H.get(P.id);if(!M)continue;if(!O.slice(0,-1).some((w,C)=>M.slice(0,-1).some((D,N)=>fG(w,O[C+1],D,M[N+1]))))continue;z.edgeCrossings+=1,Y.push({code:"edge-crossing",severity:"warning",page:Z.name,cells:[B.id,P.id],message:`${Z.name}: edges ${B.id} and ${P.id} cross`})}}}let G=Math.max(0,100-Q.errors.length*40-z.overlaps*12-z.edgeNodeIntersections*8-z.edgeCrossings*4-z.labelOverlaps*6-z.emptyLabels*2-z.missingLineJumps);return{pass:Q.valid&&z.overlaps===0&&z.edgeNodeIntersections===0&&z.labelOverlaps===0&&G>=W,score:G,threshold:W,metrics:z,issues:Y,validation:Q}}function _G(J,W){let Q=new Map,Y=[];for(let z of J.split(";").filter(Boolean)){let G=z.indexOf("="),Z=G===-1?z:z.slice(0,G);if(!Q.has(Z))Y.push(Z);Q.set(Z,G===-1?"":z.slice(G+1))}for(let[z,G]of Object.entries(W)){if(!Q.has(z))Y.push(z);Q.set(z,G)}return`${Y.map((z)=>{let G=Q.get(z)||"";return G?`${z}=${G}`:z}).join(";")};`}function xG(J,W){let Q=F6(J),Y=Q.filter(m5),z=Y.filter((j)=>S(j["@_parent"])==="1"),G=z.length>0?z:Y,Z=new Set(G.map(U5)),F=Q.filter((j)=>n8(j)&&Z.has(S(j["@_source"])||"")&&Z.has(S(j["@_target"])||""));if(G.length===0)return[];let U=G.map((j)=>({id:U5(j),label:S(j["@_value"])||U5(j)})),X=F.map((j)=>({id:U5(j),source:S(j["@_source"])||"",target:S(j["@_target"])||""})),K=G1(U,X),$=new Map;for(let j of G){let P=K.get(U5(j))||0,M=$.get(P)||[];M.push(j),$.set(P,M)}for(let j of $.values())j.sort((P,M)=>{let T=p5(P),w=p5(M),C=t(T[W==="left-to-right"?"@_y":"@_x"])||0,D=t(w[W==="left-to-right"?"@_y":"@_x"])||0;return C-D||U5(P).localeCompare(U5(M))});let H=Math.max(...G.map((j)=>t(p5(j)["@_width"])||160)),q=Math.max(...G.map((j)=>t(p5(j)["@_height"])||70)),V=H+140,L=q+90,B=new Map,O=new Set;for(let[j,P]of[...$.entries()].sort((M,T)=>M[0]-T[0]))P.forEach((M,T)=>{let w=p5(M),C=t(w["@_width"])||160,D=t(w["@_height"])||70,N={x:W==="left-to-right"?80+j*V:80+T*L,y:W==="left-to-right"?80+T*L:80+j*V,width:C,height:D};w["@_x"]=N.x,w["@_y"]=N.y,w["@_width"]=C,w["@_height"]=D,B.set(U5(M),N),O.add(U5(M))});for(let[j,P]of F.entries()){let M=S(P["@_source"]),T=S(P["@_target"]),w=B.get(M),C=B.get(T),D=F.filter((y)=>S(y["@_source"])===M),A=(D.indexOf(P)-(D.length-1)/2)*18,R=p5(P);R["@_relative"]="1",R["@_as"]="geometry";let _,V5;if(W==="left-to-right"){let y=w.x+w.width,i=C.x,u=i>y?(y+i)/2+A:Math.max(y,C.x+C.width)+80+j*18;_=[{x:u,y:w.y+w.height/2},{x:u,y:C.y+C.height/2}],V5={exitX:"1",exitY:"0.5",exitDx:"0",exitDy:"0",entryX:"0",entryY:"0.5",entryDx:"0",entryDy:"0"}}else{let y=w.y+w.height,i=C.y,u=i>y?(y+i)/2+A:Math.max(y,C.y+C.height)+80+j*18;_=[{x:w.x+w.width/2,y:u},{x:C.x+C.width/2,y:u}],V5={exitX:"0.5",exitY:"1",exitDx:"0",exitDy:"0",entryX:"0.5",entryY:"0",entryDx:"0",entryDy:"0"}}R.Array={"@_as":"points",mxPoint:_.map((y)=>({"@_x":y.x,"@_y":y.y}))},P["@_style"]=_G(S(P["@_style"])||kJ,{edgeStyle:"orthogonalEdgeStyle",rounded:"1",orthogonalLoop:"1",jettySize:"auto",html:"1",jumpStyle:"arc",jumpSize:"10",endArrow:"block",endFill:"1",...V5}),O.add(U5(P))}return[...O]}async function r8(J,W,Q){await I.mkdir(E.dirname(J),{recursive:!0});let Y=!1;try{Y=(await I.stat(J)).isFile()}catch(Z){if(Z.code!=="ENOENT")throw Z}if(Y&&!Q)throw Error("target already exists; set overwrite=true to replace it with a recoverable backup");let z=`${J}.${process.pid}.${Date.now()}.tmp`;if(await I.writeFile(z,W,"utf8"),!Y)return await I.rename(z,J),{backup:null};let G=`${J}.${new Date().toISOString().replace(/[:.]/g,"-")}.bak`;await I.rename(J,G);try{await I.rename(z,J)}catch(Z){throw await I.rename(G,J),Z}return{backup:G}}var Z1=new Set(["svg","xmlsvg","html2"]),K1=new Set(["png","jpeg","xmlpng"]),X1=new Set(["svg","xmlsvg"]),PJ=/^[A-Za-z0-9._:-]{1,120}$/;function hG(J,W,Q){let Y=W0("sha256").update(J).digest("hex").slice(0,12),z=`export-page-${W+1}-${Y}`,G=z,Z=2;while(Q.has(G))G=`${z}-${Z}`,Z+=1;return Q.add(G),G}function uG(J,W){let Q=K6.parse(J),Y=Q.mxfile;if(!Y)return{xml:J,pageId:W};let z=_5(Y.diagram),G=new Set(z.map((X)=>S(X["@_id"])).filter((X)=>Boolean(X)&&PJ.test(X))),Z=new Map,F=!1;z.forEach((X,K)=>{let $=S(X["@_id"]);if(!$||PJ.test($))return;let H=hG($,K,G);if(X["@_id"]=H,!Z.has($))Z.set($,H);F=!0});let U=W;if(W&&!PJ.test(W)){if(U=Z.get(W),!U)throw Error(`requested page ID ${JSON.stringify(W)} was not found in the Draw.io document`)}return{xml:F?D6.build(Q):J,pageId:U}}function c9(J,W){let Q=process.env[J]?.trim();if(!Q)return W;let Y=Number(Q);if(!Number.isFinite(Y)||Y<=0)throw Error(`${J} must be a positive number`);return Y}function Y0(){let J=process.env.DRAWIO_EXPORT_URL?.trim()||FG,W=new URL(J);if(!["http:","https:"].includes(W.protocol))throw Error("DRAWIO_EXPORT_URL must use http or https");return{url:W,timeoutMs:c9("DRAWIO_REQUEST_TIMEOUT",60)*1000,maxOutputBytes:c9("DRAWIO_MAX_OUTPUT_SIZE_MB",XG/1024/1024)*1024*1024}}function F1(J){if(J==="jpeg")return".jpeg";if(J==="xmlpng")return".editable.png";if(J==="xmlsvg")return".editable.svg";if(J==="html2")return".html";return`.${J}`}function H1(J){if(J==="xmlpng")return[".editable.png",".png"];if(J==="xmlsvg")return[".editable.svg",".svg"];return[F1(J)]}function IJ(J,W,Q,Y){let z=b6(J),G=Q?.trim()||h(J,W).replace(/\.(?:drawio|xml)$/i,F1(Y)),Z=s8(J,G,H1(Y)),F=E.relative(z,Z);if(!F||E.isAbsolute(F))throw Error("output file must resolve inside the current workspace");return Z}function $1(J,W,Q,Y,z){let G=IJ(J,W,Q,Y),Z=[...H1(Y)].sort((U,X)=>X.length-U.length).find((U)=>G.toLowerCase().endsWith(U));if(!Z)throw Error(`cannot derive a multi-page output name for ${Y}`);let F=G.slice(0,-Z.length);return z.map((U,X)=>({page:U,pageIndex:X+1,outputTarget:`${F}.page-${X+1}-${e9(U.name)}${Z}`}))}function q1(J,W){let Q=f(J).find((Y)=>Y.id===W);if(!Q)throw Error(`requested page ID ${JSON.stringify(W)} was not found in the Draw.io document`);return Q}function gG(J,W){q1(J,W);let Q=K6.parse(J),Y=Q.mxfile;if(!Y)throw Error("Draw.io document is missing mxfile");let G=_5(Y.diagram).find((Z)=>S(Z["@_id"])===W);if(!G)throw Error(`requested page ID ${JSON.stringify(W)} was not found in the Draw.io document`);return Y.diagram=G,D6.build(Q)}function cG(J,W,Q){if(J.length===0)throw Error("export server returned an empty response");if(!{png:["image/png","application/octet-stream"],jpeg:["image/jpeg","application/octet-stream"],pdf:["application/pdf","application/octet-stream"],xmlpng:["image/png","image/jpg","application/octet-stream"],svg:["image/svg+xml","text/plain","application/octet-stream"],xmlsvg:["image/svg+xml","text/plain","application/octet-stream"],html2:["text/html","text/plain","application/octet-stream"]}[W].some((G)=>Q.includes(G)))throw Error(`export server returned unexpected Content-Type: ${Q||"(missing)"}`);if(!(W==="png"||W==="xmlpng"?J.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):W==="jpeg"?J.subarray(0,3).equals(Buffer.from([255,216,255])):W==="pdf"?J.subarray(0,5).toString("ascii")==="%PDF-":!0))throw Error(`export server response is not a valid ${W.toUpperCase()} file`)}function mG(J){if(typeof J!=="string")throw Error("editor export data must be a data URI string");let W=J.match(/^data:([^;,]+)?((?:;[^,]*)*),(.*)$/s);if(!W)throw Error("editor returned an invalid data URI");return W[2].split(";").includes("base64")?Buffer.from(W[3],"base64"):Buffer.from(decodeURIComponent(W[3]),"utf8")}function pG(J,W){if(J.length===0)throw Error("editor export returned empty content");if(W!=="svg"&&W!=="xmlsvg"&&W!=="html2")throw Error(`${W} is not an editor-channel export format`);let Q=J.subarray(0,4096).toString("utf8");if(W==="svg"||W==="xmlsvg"){if(!Q.includes("<svg"))throw Error(`editor export is not valid ${W.toUpperCase()} content`)}else{let Y=Q.toLowerCase();if(!Y.includes("<html")&&!Y.includes("<!doctype"))throw Error("editor export is not valid HTML content")}}function dG(J){if(J==="svg"||J==="xmlsvg")return"image/svg+xml";if(J==="html2")return"text/html";return"application/octet-stream"}async function G0(J,W,Q={}){let Y=Y0(),z=uG(J,Q.pageId),G=new URLSearchParams({format:W==="xmlpng"?"png":W,xml:z.xml});if(z.pageId&&!Q.allPages)G.set("pageId",z.pageId);if(Q.allPages)G.set("allPages","1");if(Q.scale!==void 0&&Q.scale!==1)G.set("scale",String(Q.scale));if(Q.border!==void 0&&Q.border!==0)G.set("border",String(Q.border));if(G.set("bg",Q.background?.trim()||RJ),Q.embedXml)G.set("embedXml","1");let Z;try{Z=await fetch(Y.url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},body:G,redirect:"follow",signal:AbortSignal.timeout(Y.timeoutMs)})}catch(X){throw Error(`cannot reach Draw.io Export Server at ${Y.url}: ${X.message}`)}if(!Z.ok){let X="";try{X=(await Z.text()).trim().slice(0,500)}catch(K){X=`response body unavailable: ${K.message}`}throw Error(`Draw.io Export Server returned HTTP ${Z.status}${X?`: ${X}`:""}`)}let F;try{F=Buffer.from(await Z.arrayBuffer())}catch(X){throw Error(`Draw.io Export Server closed the HTTP ${Z.status} response before the export completed: ${X.message}`)}if(F.length>Y.maxOutputBytes)throw Error(`export result exceeds ${Math.floor(Y.maxOutputBytes/1024/1024)} MB`);let U=Z.headers.get("content-type")?.toLowerCase()||"";return cG(F,W,U),{content:F,contentType:U,exportUrl:Y.url.toString()}}async function yJ(J,W,Q){await I.mkdir(E.dirname(J),{recursive:!0});let Y=!1;try{Y=(await I.stat(J)).isFile()}catch(G){if(G.code!=="ENOENT")throw G}if(Y&&!Q)throw Error("output already exists; set overwrite=true to replace it");let z=`${J}.${process.pid}.${Date.now()}.tmp`;if(await I.writeFile(z,W),Y)await I.rm(J);await I.rename(z,J)}async function lG(J,W){if(new Set(J.map((z)=>E.resolve(z.target))).size!==J.length)throw Error("multi-page export resolved duplicate output paths");let Y=[];try{for(let[G,Z]of J.entries()){await I.mkdir(E.dirname(Z.target),{recursive:!0});let F=!1;try{F=(await I.stat(Z.target)).isFile()}catch(K){if(K.code!=="ENOENT")throw K}if(F&&!W)throw Error(`output already exists: ${Z.target}; set overwrite=true to replace it`);let U=`${process.pid}.${Date.now()}.${G}.${a9()}`,X=`${Z.target}.${U}.tmp`;await I.writeFile(X,Z.content),Y.push({target:Z.target,temporary:X,backup:F?`${Z.target}.${U}.previous`:null,existed:F})}let z=[];try{for(let G of Y){if(G.existed&&G.backup)await I.rename(G.target,G.backup);try{await I.rename(G.temporary,G.target),z.push(G)}catch(Z){if(G.existed&&G.backup)await I.rename(G.backup,G.target);throw Z}}}catch(G){for(let Z of z.reverse())if(await I.rm(Z.target,{force:!0}),Z.existed&&Z.backup)await I.rename(Z.backup,Z.target);throw G}for(let G of Y)if(G.backup)await I.rm(G.backup,{force:!0})}finally{for(let z of Y)if(await I.rm(z.temporary,{force:!0}),z.backup)try{await I.access(z.target)}catch{try{await I.rename(z.backup,z.target)}catch{}}}}async function m9(J){let W=IJ(J.context,J.inputTarget,J.outputPath,J.format),Q=await G0(J.xml,J.format,{pageId:J.pageId,allPages:J.allPages,scale:J.scale,border:J.border,background:J.background,embedXml:J.embedXml});return await yJ(W,Q.content,J.overwrite),{outputTarget:W,bytes:Q.content.length,contentType:Q.contentType,exportUrl:Q.exportUrl}}async function iG(J){if(!K1.has(J.format))throw Error(`${J.format} is not a per-page multi-file export format`);let W=f(J.xml),Q=$1(J.context,J.inputTarget,J.outputPath,J.format,W);if(!J.overwrite)for(let z of Q)try{if((await I.stat(z.outputTarget)).isFile())throw Error(`output already exists: ${h(J.context,z.outputTarget)}; set overwrite=true to replace it`)}catch(G){if(G.code!=="ENOENT")throw G}let Y=[];for(let z of Q){let G=await G0(J.xml,J.format,{pageId:z.page.id,scale:J.scale,border:J.border,background:J.background,embedXml:J.embedXml});Y.push({...z,...G})}for(let z of Y)await yJ(z.outputTarget,z.content,J.overwrite);return Y.map((z)=>({pageId:z.page.id,pageName:z.page.name,pageIndex:z.pageIndex,outputTarget:z.outputTarget,bytes:z.content.length,contentType:z.contentType,exportUrl:z.exportUrl}))}async function nG(J,W,Q){let Y=Date.now();while(Date.now()-Y<Q){if(J0(J,W))return!0;await new Promise((z)=>setTimeout(z,500))}return J0(J,W)}async function V1(J){if(!Z1.has(J.format))throw Error(`${J.format} is not an editor-channel export format`);let W=await DJ(J.context,J.inputTarget),Q=IJ(J.context,J.inputTarget,J.outputPath,J.format);if(!await nG(W.session.sessionId,J.inputTarget,HG)){let F=new URL("/editor",`http://${W.bridge.host}:${W.bridge.port}`);return F.searchParams.set("sessionId",W.session.sessionId),F.searchParams.set("token",W.token),{status:"editor_required",openUrl:F.toString(),tokenExpiresAt:new Date(Date.now()+$8).toISOString()}}let z=b(),G=`export_${a9()}`,Z=Y0().timeoutMs;return await new Promise((F,U)=>{let X=setTimeout(()=>{z.pendingEditorExports.delete(G),U(Error(`editor export timed out after ${Math.round(Z/1000)}s; make sure the built-in browser editor page is open and responsive, then retry`))},Z);z.pendingEditorExports.set(G,{requestId:G,sessionId:W.session.sessionId,diagramKey:g(W.session.file),format:J.format,outputTarget:Q,overwrite:J.overwrite,writeOutput:J.writeOutput!==!1,resolve:(K)=>F({status:"exported",...K,sourceRevision:J.sourceRevision}),reject:U,timer:X}),Q3(W.session,{action:"export",requestId:G,format:J.format,pageId:J.pageId,allPages:J.allPages===!0,xml:J.xml,sourceRevision:J.sourceRevision})})}async function rG(J){if(!X1.has(J.format))throw Error(`${J.format} is not an editor per-page multi-file export format`);let W=f(J.xml),Q=$1(J.context,J.inputTarget,J.outputPath,J.format,W);if(!J.overwrite)for(let z of Q)try{if((await I.stat(z.outputTarget)).isFile())throw Error(`output already exists: ${h(J.context,z.outputTarget)}; set overwrite=true to replace it`)}catch(G){if(G.code!=="ENOENT")throw G}let Y=[];for(let z of Q){let G=await V1({context:J.context,inputTarget:J.inputTarget,format:J.format,outputPath:h(J.context,z.outputTarget),xml:J.xml,pageId:z.page.id,sourceRevision:J.sourceRevision,writeOutput:!1,overwrite:J.overwrite});if(G.status==="editor_required")return G;if(!G.content)throw Error("editor export completed without buffered content");Y.push({...z,content:G.content,contentType:G.contentType})}return await lG(Y.map((z)=>({target:z.outputTarget,content:z.content})),J.overwrite),{status:"exported",sourceRevision:J.sourceRevision,outputs:Y.map((z)=>({pageId:z.page.id,pageName:z.page.name,pageIndex:z.pageIndex,outputTarget:z.outputTarget,bytes:z.content.length,contentType:z.contentType}))}}async function oG(){let J=Y0(),W=Number(J.url.port||(J.url.protocol==="https:"?443:80));return new Promise((Q)=>{let Y=KG({host:J.url.hostname,port:W}),z=setTimeout(()=>{Y.destroy(),Q({reachable:!1,error:"connection timed out"})},Math.min(J.timeoutMs,5000));Y.once("connect",()=>{clearTimeout(z),Y.end(),Q({reachable:!0})}),Y.once("error",(G)=>{clearTimeout(z),Q({reachable:!1,error:G.message})})})}async function aG(J){let W=[],Q=0;for await(let Y of J){let z=Buffer.isBuffer(Y)?Y:Buffer.from(Y);if(Q+=z.length,Q>X6)throw Error(`request body exceeds ${X6/1024/1024} MB`);W.push(z)}return Buffer.concat(W).toString("utf8")}async function L1(J,W){let Q=`${J}.${process.pid}.${Date.now()}.tmp`,Y=`${J}.${process.pid}.${Date.now()}.rollback`;await I.writeFile(Q,W,"utf8"),await I.rename(J,Y);try{await I.rename(Q,J),await I.rm(Y,{force:!0})}catch(z){throw await I.rm(J,{force:!0}),await I.rename(Y,J),z}}function sG(J,W){let Q;try{Q=new URL(J)}catch{throw Error(`${W} must be an absolute http:// or https:// URL`)}if(!["http:","https:"].includes(Q.protocol)||Q.username||Q.password)throw Error(`${W} must be an http:// or https:// URL without credentials`);return Q.hash="",Q}function wJ(J){let W=sG(J,"drawio_url");if(W.searchParams.set("embed","1"),W.searchParams.set("proto","json"),W.searchParams.set("spin","1"),W.searchParams.set("libraries","1"),W.searchParams.set("saveAndExit","0"),W.searchParams.set("noSaveBtn","0"),W.searchParams.set("offline","1"),W.protocol==="http:")W.searchParams.set("https","0");return W}function tG(J){return JSON.stringify(J).replace(/[<>&\u2028\u2029]/g,(W)=>{return`\\u${W.charCodeAt(0).toString(16).padStart(4,"0")}`})}var $5=globalThis;function b(){if(!$5.__drawioIntegratedBridge)$5.__drawioIntegratedBridge={server:null,startPromise:null,host:"127.0.0.1",port:0,sessions:new Map,tokens:new Map,eventClients:new Map,pendingEditorExports:new Map,writeQueues:new Map,annotationWriteQueues:new Map,annotationsByDiagram:new Map,historyWriteQueues:new Map,historyDebounce:new Map,previewInFlight:new Map,previewActive:0,previewWaiters:[],patchPreviews:new Map};return $5.__drawioIntegratedBridge.writeQueues||=new Map,$5.__drawioIntegratedBridge.pendingEditorExports||=new Map,$5.__drawioIntegratedBridge.annotationWriteQueues||=new Map,$5.__drawioIntegratedBridge.annotationsByDiagram||=new Map,$5.__drawioIntegratedBridge.historyWriteQueues||=new Map,$5.__drawioIntegratedBridge.historyDebounce||=new Map,$5.__drawioIntegratedBridge.previewInFlight||=new Map,$5.__drawioIntegratedBridge.previewActive||=0,$5.__drawioIntegratedBridge.previewWaiters||=[],$5.__drawioIntegratedBridge.patchPreviews||=new Map,$5.__drawioIntegratedBridge}function o(J){return W0("sha256").update(J,"utf8").digest("hex")}function e(J){return typeof J==="object"&&J!==null&&!Array.isArray(J)}function eG(J){return J==="editor"?"editor":"agent"}function bJ(J){if(J==="selection_and_edges"||J==="surrounding_layout"||J==="diagram_wide")return J;return"selection_only"}function I5(J){if(J==="diagram_wide")return"\u5141\u8BB8\u4FEE\u6539\u6574\u4E2A\u56FE\u8868";if(J==="selection_and_edges")return"\u5141\u8BB8\u8C03\u6574\u5173\u8054\u8FDE\u7EBF";if(J==="surrounding_layout")return"\u5141\u8BB8\u8C03\u6574\u5468\u8FB9\u5E03\u5C40";return"\u53EA\u4FEE\u6539\u9009\u533A"}function p9(J){if(J==="diagram_wide")return 3;if(J==="selection_and_edges")return 1;if(J==="surrounding_layout")return 2;return 0}function fJ(J){if(J.history.push({revision:J.revision,xml:J.xml,updatedBy:J.updatedBy,updatedAt:J.updatedAt}),J.history.length>v9)J.history.splice(0,J.history.length-v9)}function o8(J,W){let Q=J.history.find((Y)=>Y.revision===W);if(!Q)return{available:!1,reason:"base revision is no longer in the in-memory history"};try{return{available:!0,fromRevision:W,toRevision:J.revision,diff:w6(f(Q.xml),f(J.xml))}}catch(Y){return{available:!1,reason:`unable to calculate revision diff: ${Y.message}`}}}async function c(J){let W=await C5(J.file),Q=o(W);if(Q===J.fileHash)return J;let Y=f(W),z=l(Y);if(!z.valid)throw Error(`workspace file changed to invalid Draw.io XML: ${JSON.stringify(z.errors)}`);return fJ(J),J.revision+=1,J.xml=W,J.fileHash=Q,J.updatedBy="external",J.updatedAt=new Date().toISOString(),uJ(J.file,null),vJ(J),await x5(J,{source:"external",xml:W,sessionRevision:J.revision}),J}function k5(J,W){let Q=J.sessionID?.trim();if(!Q)return null;let Y=b().sessions.get(Q);if(!Y||E.resolve(Y.file)!==E.resolve(W))return null;return Y}function d8(J,W){if(W?.trim())return k5(J,P5(J,W));return b().sessions.get(J.sessionID)||null}async function H8(J,W,Q,Y,z=null,G={}){let Z=b(),F=E.resolve(J.file).toLowerCase(),X=(Z.writeQueues.get(F)||Promise.resolve()).catch(()=>{return}).then(async()=>{let K=W,$=null;if(await c(J),Q!==J.revision){let V=o8(J,Q);if(G.autoMerge){let L=J.history.find((O)=>O.revision===Q),B=L?wG(L.xml,W,J.xml):{status:"unavailable",reason:"base revision is no longer in memory"};if(B.status==="merged"){if(K=B.xml,$={status:"merged",fromRevision:Q,ontoRevision:J.revision,localChangedKeys:B.localChangedKeys,remoteChangedKeys:B.remoteChangedKeys},B.localChangedKeys.length===0||o(K)===J.fileHash)return{conflict:!1,document:J,validation:l(f(J.xml)),autoMerge:$}}else return{conflict:!0,current:J,manualChanges:V,merge:B}}else return{conflict:!0,current:J,manualChanges:V,merge:null}}let H=f(K),q=l(H);if(!q.valid)return{invalid:!0,report:q};if(fJ(J),!J.backupFile){let V=await r8(J.file,K,!0);J.backupFile=V.backup}else await L1(J.file,K);if(J.revision+=1,J.xml=K,J.fileHash=o(K),J.updatedBy=Y,J.updatedAt=new Date().toISOString(),uJ(J.file,G.appliedPreviewId||null),vJ(J,z),Y==="agent")try{await x5(J,{source:"agent",xml:K,sessionRevision:J.revision})}catch(V){console.warn(`history snapshot record failed for ${J.file}: ${V.message}`)}else H3(J);return{conflict:!1,document:J,validation:q,autoMerge:$}});return Z.writeQueues.set(F,X),X.catch(()=>{return}).finally(()=>{if(Z.writeQueues.get(F)===X)Z.writeQueues.delete(F)}),X}function J3(J){let Q=new URL(J.url||"/",`http://${J.headers.host||"localhost"}`).searchParams.get("token")||"",Y=b().tokens.get(Q);if(!Y||Y.expiresAt<=Date.now())return b().tokens.delete(Q),null;let z=b().sessions.get(Y.sessionId);if(!z)return null;if(g(z.file)!==Y.diagramKey)return null;if(z.bindingId!==Y.bindingId)return null;return Y.expiresAt=Date.now()+$8,{sessionKey:Q,session:z}}function k(J,W,Q){J.writeHead(W,{"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"}),J.end(JSON.stringify(Q))}async function F8(J){let W=await aG(J),Q=JSON.parse(W);if(!e(Q))throw Error("request body must be a JSON object");return Q}function Z5(J){return{sessionId:J.sessionId,file:E.relative(J.workspace,J.file).split(E.sep).join("/"),revision:J.revision,xml:J.xml,updatedBy:J.updatedBy,updatedAt:J.updatedAt,backup:J.backupFile?E.relative(J.workspace,J.backupFile).split(E.sep).join("/"):null}}function vJ(J,W=null){let Q=`event: diagram\\ndata: ${JSON.stringify({revision:J.revision,updatedBy:J.updatedBy,updatedAt:J.updatedAt,clientId:W})}

`,Y=g(J.file);for(let z of b().eventClients.get(J.sessionId)||[])if(z.diagramKey===Y)z.response.write(Q)}function J0(J,W){let Q=g(W);return[...b().eventClients.get(J)||[]].some((Y)=>Y.diagramKey===Q)}function Q3(J,W){let Q=`event: editor-command
data: ${JSON.stringify(W)}

`,Y=g(J.file);[...b().eventClients.get(J.sessionId)||[]].find((G)=>G.diagramKey===Y)?.response.write(Q)}function d9(J){return E.join(J,".mobilework","drawio-history","v1")}function W3(J){return W0("sha256").update(J.replace(/\\/g,"/"),"utf8").digest("hex").slice(0,12)}function A5(J){let W=E.relative(J.workspace,J.file).split(E.sep).join("/");return`${E.basename(J.file)}--${W3(W)}`}function z0(J,W){let Q=E.resolve(W),Y=E.resolve(J);if(Q!==Y&&!Q.startsWith(Y+E.sep))throw Error("history path escapes the history directory");return Q}function n5(J){return z0(d9(J.workspace),E.join(d9(J.workspace),A5(J)))}function _J(J){return E.join(n5(J),"manifest.json")}function xJ(J,W){if(!q8.test(W))throw Error("invalid snapshot id");return z0(n5(J),E.join(n5(J),"snapshots",`${W}.drawio`))}function B1(J){let W=String(J).replace(/[^A-Za-z0-9_-]/g,"_").slice(0,120);if(!W)throw Error("invalid page id");return W}function j1(J,W,Q,Y){if(!q8.test(W))throw Error("invalid snapshot id");let z=B1(Q),G=Y==="preview"?`${z}-preview.png`:`${z}-thumb.png`;return z0(n5(J),E.join(n5(J),"previews",W,G))}function Y3(J){if(!e(J))return!1;if(typeof J.id!=="string"||!q8.test(J.id))return!1;if(!Number.isInteger(J.sequence))return!1;if(typeof J.createdAt!=="string")return!1;if(!["initial","editor","agent","external","restore"].includes(J.source))return!1;if(J.sessionId!==null&&typeof J.sessionId!=="string")return!1;if(!Number.isInteger(J.sessionRevision))return!1;if(typeof J.contentHash!=="string")return!1;if(J.parentSnapshotId!==null&&typeof J.parentSnapshotId!=="string")return!1;if(J.restoredFromSnapshotId!==null&&typeof J.restoredFromSnapshotId!=="string")return!1;if(!Array.isArray(J.pages))return!1;for(let W of J.pages)if(!e(W)||typeof W.id!=="string"||typeof W.name!=="string")return!1;if(!["pending","ready","failed","unavailable"].includes(J.previewState))return!1;return!0}function G3(J){if(!e(J))return!1;if(J.schemaVersion!==t9)return!1;if(!e(J.file))return!1;if(typeof J.file.relativePath!=="string"||typeof J.file.pathKey!=="string")return!1;if(!Number.isInteger(J.nextSequence)||J.nextSequence<1)return!1;if(!Array.isArray(J.entries))return!1;for(let W of J.entries)if(!Y3(W))return!1;return!0}async function r5(J){let W=_J(J),Q;try{Q=await I.readFile(W,"utf8")}catch(z){if(z.code==="ENOENT")return null;throw z}let Y;try{Y=JSON.parse(Q)}catch(z){throw Error(`history manifest for ${A5(J)} is corrupted: ${z.message}`)}if(!G3(Y))throw Error(`history manifest for ${A5(J)} failed schema validation`);return Y}async function M1(J,W){if(U0("manifest"))throw Error("injected history manifest write failure");let Q=_J(J);await I.mkdir(E.dirname(Q),{recursive:!0});let Y=`${Q}.${process.pid}.${Date.now()}.tmp`;await I.writeFile(Y,JSON.stringify(W,null,2),"utf8"),await I.rename(Y,Q)}function U0(J){return globalThis.__drawioHistoryFaults?.[J]===!0}function z3(){return`h_${new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z")}_${i5(4).toString("hex")}`}function NJ(J){if(J==="editor"||J==="agent"||J==="external"||J==="initial"||J==="restore")return J;return"initial"}function Q0(J,W,Q){let Y=`event: history
data: ${JSON.stringify({kind:W,...Q})}

`,z=g(J.file);for(let G of b().eventClients.get(J.sessionId)||[])if(G.diagramKey===z)G.response.write(Y)}function P1(J){return E.resolve(n5(J)).toLowerCase()}function O1(J,W){let Q=b(),z=(Q.historyWriteQueues.get(J)||Promise.resolve()).catch(()=>{return}).then(W);return Q.historyWriteQueues.set(J,z),z.catch(()=>{return}).finally(()=>{if(Q.historyWriteQueues.get(J)===z)Q.historyWriteQueues.delete(J)}),z}async function U3(J,W){try{for(let Q of W){await I.rm(xJ(J,Q),{force:!0});let Y=z0(n5(J),E.join(n5(J),"previews",Q));await I.rm(Y,{recursive:!0,force:!0})}}catch(Q){console.warn(`history cleanup failed for ${A5(J)}: ${Q.message}`)}}function Z3(J){let W=[];while(J.entries.length>VG){let Q=J.entries.shift();if(Q)W.push(Q.id)}return W}async function x5(J,W){return O1(P1(J),async()=>{let Q=await r5(J)||{schemaVersion:t9,file:{relativePath:E.relative(J.workspace,J.file).split(E.sep).join("/"),pathKey:A5(J)},nextSequence:1,entries:[]},Y=o(W.xml),z=f(W.xml).map(($)=>({id:$.id,name:$.name})),G=Q.entries[Q.entries.length-1]||null;if(!W.force&&G&&G.contentHash===Y)return{created:!1,snapshot:G};let Z=z3(),F={id:Z,sequence:Q.nextSequence,createdAt:new Date().toISOString(),source:W.source,sessionId:W.sessionId??J.sessionId,sessionRevision:W.sessionRevision??J.revision,contentHash:Y,parentSnapshotId:G?G.id:null,restoredFromSnapshotId:W.restoredFromSnapshotId??null,pages:z,previewState:"pending"},U=xJ(J,Z);if(U0("snapshotXml"))throw Error("injected snapshot xml write failure");await I.mkdir(E.dirname(U),{recursive:!0});let X=`${U}.${process.pid}.${Date.now()}.tmp`;await I.writeFile(X,W.xml,"utf8"),await I.rename(X,U),Q.entries.push(F),Q.nextSequence+=1;let K=Z3(Q);if(await M1(J,Q),K.length>0)U3(J,K);if(z.length>0)F3(J,F.id,z[0].id,"thumb");for(let $ of K)Q0(J,"snapshot-evicted",{snapshotId:$});return Q0(J,"snapshot-created",{snapshotId:F.id,sequence:F.sequence,source:F.source}),{created:!0,snapshot:F}})}async function l9(J,W,Q){await O1(P1(J),async()=>{let Y=await r5(J);if(!Y)return;let z=Y.entries.find((G)=>G.id===W);if(!z)return;z.previewState=Q,await M1(J,Y)})}async function hJ(J,W,Q){let Y=await I.readFile(xJ(J,W),"utf8");if(Buffer.byteLength(Y,"utf8")>X6)throw Error("snapshot exceeds the size limit");if(Q&&o(Y)!==Q)throw Error("snapshot content hash mismatch");return Y}async function K3(){let J=b();while(J.previewActive>=BG)await new Promise((W)=>J.previewWaiters.push(W));J.previewActive+=1}function X3(){let J=b();J.previewActive-=1;let W=J.previewWaiters.shift();if(W)W()}async function C1(J,W,Q,Y){let z=b(),G=`${W}|${B1(Q)}|${Y}`,Z=z.previewInFlight.get(G);if(Z)return Z;let F=(async()=>{await K3();try{let X=(await r5(J))?.entries.find((L)=>L.id===W);if(!X)throw Error("snapshot not found in preview");let K=await hJ(J,W,X.contentHash);if(!f(K).find((L)=>L.id===Q))throw Error("page not found in snapshot");let H=await G0(K,"png",{pageId:Q,scale:Y==="thumb"?jG:1,background:"#ffffff"});if(H.content.length>MG)throw Error("preview exceeds the size limit");let q=j1(J,W,Q,Y);await I.mkdir(E.dirname(q),{recursive:!0});let V=`${q}.${process.pid}.${Date.now()}.tmp`;if(await I.writeFile(V,H.content),await I.rename(V,q),Y==="thumb")await l9(J,W,"ready");return Q0(J,"preview-ready",{snapshotId:W,pageId:Q,mode:Y}),H.content}catch(U){if(Y==="thumb")await l9(J,W,"failed");throw Q0(J,"preview-failed",{snapshotId:W,pageId:Q,mode:Y,error:U.message}),U}finally{X3(),z.previewInFlight.delete(G)}})();return z.previewInFlight.set(G,F),F}function F3(J,W,Q,Y){C1(J,W,Q,Y).catch(()=>{return})}function H3(J){let W=b(),Q=A5(J),Y=W.historyDebounce.get(Q);if(Y)clearTimeout(Y.timer);let z=setTimeout(()=>{A1(J.sessionId,Q).catch((G)=>console.warn(`editor history checkpoint failed for ${J.file}: ${G.message}`))},LG);if(typeof z.unref==="function")z.unref();W.historyDebounce.set(Q,{timer:z,sessionId:J.sessionId,revision:J.revision,hash:J.fileHash})}async function A1(J,W){let Q=b(),Y=Q.historyDebounce.get(W);if(Y)clearTimeout(Y.timer),Q.historyDebounce.delete(W);if(!Y)return;let z=Q.sessions.get(J);if(!z)return;if(z.revision!==Y.revision||z.fileHash!==Y.hash)return;await x5(z,{source:"editor",xml:z.xml,sessionRevision:Y.revision})}async function R1(J){await A1(J.sessionId,A5(J))}async function T1(J){try{let W=_J(J),Q=new Date().toISOString().replace(/[:.]/g,"-");await I.rename(W,`${W}.corrupt-${Q}`),console.warn(`quarantined corrupt history manifest for ${A5(J)} to ${E.basename(W)}.corrupt-${Q}`)}catch(W){if(W.code!=="ENOENT")console.warn(`unable to quarantine corrupt history manifest for ${A5(J)}: ${W.message}`)}}async function $3(J){let W=await r5(J),Q=W&&W.entries.length>0?W.entries[W.entries.length-1]:null;if(!Q){await x5(J,{source:NJ(J.updatedBy),xml:J.xml,sessionRevision:J.revision});return}if(Q.contentHash!==J.fileHash)await x5(J,{source:NJ(J.updatedBy),xml:J.xml,sessionRevision:J.revision})}async function q3(J){let W=null;try{W=await r5(J)}catch(Y){J.historyWarning=`history re-initialized: previous manifest was corrupted (${Y.message})`,console.warn(`${J.historyWarning} for ${A5(J)}`),await T1(J);return}let Q=W&&W.entries.length>0?W.entries[W.entries.length-1]:null;try{if(!Q)await x5(J,{source:"initial",xml:J.xml,sessionRevision:J.revision});else if(Q.contentHash!==J.fileHash)await x5(J,{source:"external",xml:J.xml,sessionRevision:J.revision})}catch(Y){J.historyWarning=`history disabled: ${Y.message}`,console.warn(`${J.historyWarning} for ${A5(J)}`)}}async function V3(J,W,Q,Y){let z=b(),G=E.resolve(J.file).toLowerCase(),F=(z.writeQueues.get(G)||Promise.resolve()).catch(()=>{return}).then(async()=>{if(await c(J),Q!==J.revision)return{conflict:!0,current:J};let U=await r5(J);if(!U)return{invalid:!0,error:"snapshot_not_found"};let X=U.entries.find((L)=>L.id===W);if(!X)return{invalid:!0,error:"snapshot_not_found"};if(U0("preRestoreCheckpoint"))return{checkpointFailed:!0,error:"injected pre-restore checkpoint failure"};try{await R1(J),await x5(J,{source:NJ(J.updatedBy),xml:J.xml,sessionRevision:J.revision})}catch(L){return{checkpointFailed:!0,error:`pre-restore checkpoint failed: ${L.message}`}}let K;try{K=await hJ(J,X.id,X.contentHash)}catch(L){if(L.code==="ENOENT")return{invalid:!0,error:"snapshot_not_found"};return{invalid:!0,error:`snapshot_damaged: ${L.message}`}}let $;try{$=l(f(K))}catch(L){return{invalid:!0,error:`snapshot_damaged: ${L.message}`}}if(!$.valid)return{invalid:!0,error:`snapshot_damaged: ${JSON.stringify($.errors)}`};if(X.contentHash===J.fileHash)return{invalid:!0,error:"current_snapshot"};await L1(J.file,K),fJ(J),J.revision+=1,J.xml=K,J.fileHash=o(K),J.updatedBy="restore",J.updatedAt=new Date().toISOString(),uJ(J.file,null);let H=null;try{await L3(J)}catch(L){H=`diagram restored, but annotation invalidation could not be persisted: ${L.message}`,console.warn(H)}try{vJ(J,Y)}catch(L){console.warn(`diagram revision broadcast failed: ${L.message}`)}let q=X.sequence,V;try{V=await x5(J,{source:"restore",xml:K,sessionRevision:J.revision,restoredFromSnapshotId:X.id,force:!0})}catch(L){return{partFailed:!0,document:J,message:H?`${H} restore snapshot also failed: ${L.message}`:`diagram restored, but the restore snapshot could not be recorded: ${L.message}`}}if(!V.created||!V.snapshot)return{partFailed:!0,document:J,message:H?H:"diagram restored, but the restore snapshot could not be recorded"};return{ok:!0,document:J,snapshot:V.snapshot,restoredFromSequence:q,annotationInvalidationWarning:H}});return z.writeQueues.set(G,F),F.catch(()=>{return}).finally(()=>{if(z.writeQueues.get(G)===F)z.writeQueues.delete(G)}),F}async function L3(J){let W=g(J.file);for(let Q of b().sessions.values()){if(g(Q.file)!==W)continue;for(let Y of Q.annotationAuthorizations.values()){if(!Y.previewId)continue;let z=b().patchPreviews.get(Y.previewId);if(z)I6(Q,z,"\u5173\u8054\u7684\u6807\u6CE8\u5BA1\u6279\u5DF2\u5931\u6548")}Q.annotationAuthorizations.clear(),Q.activeAnnotationId=null}}function E1(J){return`${J.file.replace(/\.(drawio|xml)$/i,"")}.annotations.json`}function g(J){let W=E.resolve(J);return process.platform==="win32"?W.toLowerCase():W}function K5(J){let W=b(),Q=g(J.file),Y=W.annotationsByDiagram.get(Q);if(!Y)Y=new Map,W.annotationsByDiagram.set(Q,Y);return Y}async function B3(J){if(J.workspace===void 0)return;let W=K5(J);if(W.size>0)return;let Q;try{Q=await I.readFile(E1(J),"utf8")}catch(G){if(G.code!=="ENOENT")throw G;return}let Y;try{Y=JSON.parse(Q)}catch{return}let z=Array.isArray(Y)?Y:e(Y)&&Array.isArray(Y.annotations)?Y.annotations:[];for(let G of z){if(!e(G)||typeof G.id!=="string")continue;let Z=P3(G,J);if(Z)W.set(Z.id,Z)}}function U6(J,W=!1){return{id:J.id,file:J.file,pageId:J.pageId,baseRevision:J.baseRevision,candidateHash:J.candidateHash,changedIds:J.changedIds,changedQualifiedIds:J.changedQualifiedIds,affectedPageIds:J.affectedPageIds,diff:J.diff,summary:J.diff.summary,status:J.status,statusReason:J.statusReason,approvedAt:J.approvedAt,consumedAt:J.consumedAt,createdAt:J.createdAt,expiresAt:new Date(J.expiresAt).toISOString(),...W?{xml:J.comparePreviewXml,beforePreviewXml:J.beforePreviewXml,afterPreviewXml:J.candidateXml,candidateXml:J.candidateXml,comparePreviewXml:J.comparePreviewXml}:{}}}function H6(J,W){let Q=b().sessions.get(J.sessionId);if(!Q||g(Q.file)!==J.diagramKey)return;let Y=`event: preview
data: ${JSON.stringify({kind:W,preview:U6(J)})}

`;for(let z of b().eventClients.get(J.sessionId)||[])if(z.diagramKey===J.diagramKey)z.response.write(Y)}function j3(J=Date.now()){let W=b();for(let[Q,Y]of W.patchPreviews){let z=Y.terminalAt;if(z!==null&&z+qG<=J)W.patchPreviews.delete(Q)}}function v5(J){if(j3(),!J.activePreviewId)return null;let W=b().patchPreviews.get(J.activePreviewId);if(!W||W.sessionId!==J.sessionId||W.diagramKey!==g(J.file))return J.activePreviewId=null,null;if((W.status==="pending"||W.status==="authorized")&&W.expiresAt<=Date.now())W.status="stale",W.statusReason="\u9884\u89C8\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u57FA\u4E8E\u6700\u65B0\u56FE\u8868\u91CD\u65B0\u751F\u6210",W.approvalToken=null,W.terminalAt=Date.now(),J.activePreviewId=null,H6(W,"stale");else if((W.status==="pending"||W.status==="authorized")&&(W.baseRevision!==J.revision||W.baseFileHash!==J.fileHash))W.status="stale",W.statusReason=`\u56FE\u8868\u5DF2\u4ECE revision ${W.baseRevision} \u66F4\u65B0\u5230 ${J.revision}`,W.approvalToken=null,W.terminalAt=Date.now(),J.activePreviewId=null,H6(W,"stale");return W}function I6(J,W,Q){if(W.status==="applied"||W.status==="cancelled")return;W.status="cancelled",W.statusReason=Q,W.approvalToken=null,W.terminalAt=Date.now();for(let[Y,z]of J.annotationAuthorizations)if(z.previewId===W.id&&!z.consumedAt)J.annotationAuthorizations.delete(Y);if(J.activePreviewId===W.id)J.activePreviewId=null;H6(W,"cancelled")}function OJ(J,W,Q,Y,z,G){if(W.includes(O5)||Q.includes(O5))throw Error("formal Draw.io XML must not contain reserved preview artifacts");let Z=v5(J);if(Z&&(Z.status==="pending"||Z.status==="authorized"))I6(J,Z,"\u5DF2\u751F\u6210\u65B0\u7684\u4FEE\u6539\u9884\u89C8");let F=`prv_${i5(9).toString("base64url")}`,U=new Date().toISOString(),X=[...new Set([...G.added.map((q)=>q.key),...G.removed.map((q)=>q.key),...G.changed.map((q)=>q.key),...G.pageChanges.map((q)=>`${q.pageId}:@page`)])],K=[...new Set([...G.added.map((q)=>y6(q.key,q.cell.id)),...G.removed.map((q)=>y6(q.key,q.cell.id)),...G.changed.map((q)=>q.pageId),...G.pageChanges.map((q)=>q.pageId)])].filter(Boolean),$=M3(W,Q,G,F),H={id:F,sessionId:J.sessionId,diagramKey:g(J.file),file:E.relative(J.workspace,J.file).split(E.sep).join("/"),pageId:Y,baseRevision:J.revision,baseFileHash:J.fileHash,candidateXml:Q,candidateHash:o(Q),beforePreviewXml:W,comparePreviewXml:$,changedIds:[...new Set(z.length>0?z:[...G.added.map((q)=>q.cell.id),...G.removed.map((q)=>q.cell.id),...G.changed.map((q)=>q.cellId),...G.pageChanges.map(()=>"@page")])],changedQualifiedIds:X,affectedPageIds:K,diff:G,status:"pending",statusReason:null,approvalToken:null,approvedAt:null,consumedAt:null,createdAt:U,expiresAt:Date.now()+$G,terminalAt:null};return b().patchPreviews.set(F,H),J.activePreviewId=F,H6(H,"created"),H}function i9(J,W,Q){let Y=v5(J);if(!Y||Y.id!==W.id)throw Error("patch preview is no longer active");if(W.status!=="pending")throw Error(`patch preview is ${W.status}; generate a fresh dry-run preview`);W.status="authorized",W.statusReason=null,W.approvalToken=Q,W.approvedAt=new Date().toISOString(),H6(W,"authorized")}function l8(J,W,Q,Y,z){if(!W)throw Error("preview_id is required for an active-session write; create a dry-run preview first");let G=b().patchPreviews.get(W);if(!G||G.sessionId!==J.sessionId||G.diagramKey!==g(J.file))throw Error("patch preview not found for this session and diagram");if(v5(J),G.status!=="authorized")throw Error(`patch preview is ${G.status}; approve the visible preview before writing`);if(!Q||G.approvalToken!==Q)throw Error("patch preview approval token is missing or invalid");if(G.consumedAt)throw Error("patch preview approval token has already been used");if(G.baseRevision!==Y||G.baseRevision!==J.revision)throw Error("patch preview revision no longer matches the active diagram");if(G.candidateHash!==o(z))throw Error("formal write does not match the candidate XML shown in the preview");return G}function uJ(J,W){let Q=b(),Y=g(J),z=Date.now();for(let G of Q.patchPreviews.values()){if(G.diagramKey!==Y||G.status!=="pending"&&G.status!=="authorized")continue;let Z=Q.sessions.get(G.sessionId);if(G.id===W){if(G.status="applied",G.statusReason=null,G.consumedAt=new Date(z).toISOString(),G.terminalAt=z,Z?.activePreviewId===G.id)Z.activePreviewId=null;H6(G,"applied")}else{if(G.status="stale",G.statusReason="\u56FE\u8868\u5DF2\u88AB\u5176\u5B83\u4FEE\u6539\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u751F\u6210\u9884\u89C8",G.approvalToken=null,G.terminalAt=z,Z?.activePreviewId===G.id)Z.activePreviewId=null;H6(G,"stale")}}}function w1(J,W){let Q=J?.trim()||"";return`${Q}${Q&&!Q.endsWith(";")?";":""}${W}`}function y6(J,W){return J.slice(0,Math.max(0,J.length-W.length-1))}function i8(J,W,Q,Y,z="",G=!1){let Z=G?0:6;return{"@_id":J,"@_value":z,"@_style":["rounded=1","whiteSpace=wrap","html=1",`fillColor=${G?Y:"none"}`,`strokeColor=${Y}`,`strokeWidth=${G?3:4}`,"dashed=1",`opacity=${G?28:80}`,`fontColor=${Y}`,"fontStyle=1","movable=0","resizable=0","editable=0","deletable=0","connectable=0","pointerEvents=0","shadow=0"].join(";")+";","@_vertex":"1","@_parent":W,mxGeometry:{"@_x":String(Q.x-Z),"@_y":String(Q.y-Z),"@_width":String(Math.max(1,Q.width+Z*2)),"@_height":String(Math.max(1,Q.height+Z*2)),"@_as":"geometry"}}}function n9(J,W,Q,Y,z=85){let G=JSON.parse(JSON.stringify(J));return G["@_id"]=W,G["@_parent"]=Q,G["@_value"]="",G["@_style"]=w1(S(G["@_style"]),`strokeColor=${Y};strokeWidth=4;opacity=${z};dashed=1;movable=0;editable=0;deletable=0;pointerEvents=0;`),G}function M3(J,W,Q,Y){let z=f(J),G=f(W),Z=Z6(J),F=Z6(W),U=new Map(z.map((j)=>[j.id,j])),X=new Map(G.map((j)=>[j.id,j])),K=new Map(Z.pages.map((j)=>[j.id,j])),$=new Map(F.pages.map((j)=>[j.id,j])),H=new Map(Q.changed.map((j)=>[j.key,j])),q=new Set(Q.added.map((j)=>j.key)),V=new Set(Q.removed.map((j)=>j.key)),L=0;for(let[j,P]of $){let M=U.get(j),T=X.get(j);if(!T)continue;if(!(Q.added.some((y)=>y6(y.key,y.cell.id)===j)||Q.removed.some((y)=>y6(y.key,y.cell.id)===j)||Q.changed.some((y)=>y.key.startsWith(`${j}:`))))continue;let C=F6(P),D=`${O5}layer_${Y}_${L++}`;C.push({"@_id":D,"@_value":"AI \u4FEE\u6539\u9884\u89C8\uFF08\u4E34\u65F6\uFF09","@_parent":"0"});let N=new Map(C.map((y)=>[U5(y),y])),A=S6(T.cells),R=M?S6(M.cells):null,_=new Map((M?.cells||[]).map((y)=>[y.id,y])),V5=new Map(T.cells.map((y)=>[y.id,y]));for(let y of T.cells){if(!y.vertex&&!y.edge)continue;let i=`${j}:${y.id}`,u=N.get(y.id);if(q.has(i)){if(y.vertex){let n=q5(y,A);if(n)C.push(i8(`${O5}added_${Y}_${L++}`,D,n,"#22c55e"))}else if(u)C.push(n9(u,`${O5}added_edge_${Y}_${L++}`,D,"#22c55e"));continue}let L5=H.get(i);if(!L5)continue;if(y.vertex){let n=q5(y,A);if(n)C.push(i8(`${O5}changed_${Y}_${L++}`,D,n,"#f59e0b"));let s=_.get(y.id);if(s&&R&&JSON.stringify(L5.before.geometry)!==JSON.stringify(L5.after.geometry)){let $6=q5(s,R);if($6)C.push(i8(`${O5}old_${Y}_${L++}`,D,$6,"#ef4444","\u539F\u4F4D\u7F6E",!0))}}else if(u)C.push(n9(u,`${O5}changed_edge_${Y}_${L++}`,D,"#3b82f6"))}if(M&&R){let y=K.get(j),i=new Map(y?F6(y).map((u)=>[U5(u),u]):[]);for(let u of M.cells){let L5=`${j}:${u.id}`;if(!V.has(L5))continue;if(u.vertex){let n=q5(u,R);if(n)C.push(i8(`${O5}removed_${Y}_${L++}`,D,n,"#ef4444",`\u5220\u9664\uFF1A${u.label?.trim()||u.id}`,!0));continue}if(u.edge&&u.source&&u.target&&V5.has(u.source)&&V5.has(u.target)){let n=i.get(u.id);if(!n)continue;let s=JSON.parse(JSON.stringify(n));s["@_id"]=`${O5}removed_edge_${Y}_${L++}`,s["@_parent"]=D,s["@_value"]=u.label?`\u5220\u9664\uFF1A${u.label}`:"",s["@_style"]=w1(S(s["@_style"]),"strokeColor=#ef4444;strokeWidth=4;opacity=45;dashed=1;movable=0;editable=0;deletable=0;"),C.push(s)}}}}let B=V8(F),O=l(f(B));if(!O.valid)throw Error(`generated preview XML is invalid: ${JSON.stringify(O.errors)}`);return B}async function L8(J){let W=b(),Q=g(J.file),z=(W.annotationWriteQueues.get(Q)||Promise.resolve()).catch(()=>{return}).then(async()=>{if(U0("annotationsFile"))throw Error("injected annotation sidecar write failure");let Z=[...K5(J).values()].map((K)=>({id:K.id,file:K.file,pageId:K.pageId,pageName:K.pageName,cells:K.cells,region:K.region,instruction:K.instruction,scope:K.scope,status:K.status,baseRevision:K.baseRevision,baseFileHash:K.baseFileHash,baseCellHashes:K.baseCellHashes,result:K.result,createdAt:K.createdAt,updatedAt:K.updatedAt,resolvedAt:K.resolvedAt,ignoredAt:K.ignoredAt,ignoredReason:K.ignoredReason})),F={schemaVersion:3,file:E.relative(J.workspace,J.file).split(E.sep).join("/"),annotations:Z},U=E1(J),X=`${U}.${process.pid}.${Date.now()}.tmp`;await I.writeFile(X,JSON.stringify(F,null,2),"utf8"),await I.rename(X,U)});W.annotationWriteQueues.set(Q,z);try{await z}finally{if(W.annotationWriteQueues.get(Q)===z)W.annotationWriteQueues.delete(Q)}}function P3(J,W){let Q=Array.isArray(J.cells)?J.cells.filter((G)=>e(G)&&typeof G.id==="string").map((G)=>({id:String(G.id),kind:G.kind==="edge"?"edge":"node",label:typeof G.label==="string"?G.label:"",source:typeof G.source==="string"?G.source:void 0,target:typeof G.target==="string"?G.target:void 0})):[],Y=e(J.region)&&typeof J.region.x==="number"?{x:Number(J.region.x),y:Number(J.region.y),width:Number(J.region.width),height:Number(J.region.height)}:null,z=J.status==="resolved"||J.status==="ignored"?J.status:"open";return{id:String(J.id),file:E.relative(W.workspace,W.file).split(E.sep).join("/"),pageId:typeof J.pageId==="string"?String(J.pageId):"",pageName:typeof J.pageName==="string"?String(J.pageName):"",cells:Q,region:Y,instruction:typeof J.instruction==="string"?String(J.instruction):"",scope:bJ(J.scope),status:z,baseRevision:Number.isInteger(J.baseRevision)?Number(J.baseRevision):0,baseFileHash:typeof J.baseFileHash==="string"?String(J.baseFileHash):"",baseCellHashes:e(J.baseCellHashes)?Object.fromEntries(Object.entries(J.baseCellHashes).filter((G)=>typeof G[1]==="string")):{},result:e(J.result)&&typeof J.result.summary==="string"?{summary:String(J.result.summary),changedIds:Array.isArray(J.result.changedIds)?J.result.changedIds.map((G)=>String(G)):[],revision:Number.isInteger(J.result.revision)?Number(J.result.revision):0,updatedAt:typeof J.result.updatedAt==="string"?String(J.result.updatedAt):""}:null,createdAt:typeof J.createdAt==="string"?String(J.createdAt):new Date().toISOString(),updatedAt:typeof J.updatedAt==="string"?String(J.updatedAt):new Date().toISOString(),resolvedAt:typeof J.resolvedAt==="string"?String(J.resolvedAt):null,ignoredAt:typeof J.ignoredAt==="string"?String(J.ignoredAt):null,ignoredReason:typeof J.ignoredReason==="string"?String(J.ignoredReason):null}}function O3(J,W,Q){let Y=J.find(($)=>$.id===W||!W);if(!Y)return null;let z=S6(Y.cells),G=z.cellsById,Z=Number.POSITIVE_INFINITY,F=Number.POSITIVE_INFINITY,U=Number.NEGATIVE_INFINITY,X=Number.NEGATIVE_INFINITY,K=!1;for(let $ of Q){let H=G.get($);if(!H)continue;let q=null;if(H.vertex)q=q5(H,z);else if(H.edge){let V=U1(H,G,z);if(V&&V.length>0){let{POSITIVE_INFINITY:L,POSITIVE_INFINITY:B,NEGATIVE_INFINITY:O,NEGATIVE_INFINITY:j}=Number;for(let P of V)L=Math.min(L,P.x),B=Math.min(B,P.y),O=Math.max(O,P.x),j=Math.max(j,P.y);q={x:L,y:B,width:O-L,height:j-B}}}if(!q)continue;K=!0,Z=Math.min(Z,q.x),F=Math.min(F,q.y),U=Math.max(U,q.x+q.width),X=Math.max(X,q.y+q.height)}if(!K)return null;return{x:Z,y:F,width:U-Z,height:X-F}}function C3(J,W,Q){let Y=J.find((G)=>G.id===W||!W);if(!Y)return{};let z=new Map(Y.cells.map((G)=>[G.id,G]));return Object.fromEntries(Q.flatMap((G)=>{let Z=z.get(G);return Z?[[`${Y.id}:${G}`,o(JSON.stringify(d5(Z)))]]:[]}))}function N1(J,W){return J.x<=W.x+W.width&&J.x+J.width>=W.x&&J.y<=W.y+W.height&&J.y+J.height>=W.y}function D1(J,W,Q){let Y=f(J.xml),z=W.pageId?Y.find((H)=>H.id===W.pageId):Y[0];if(!z)throw Error(`annotation page not found: ${W.pageId||"(first page)"}`);let G=new Map(z.cells.map((H)=>[H.id,H])),Z=new Set(W.cells.map((H)=>H.id)),F=new Set(W.cells.filter((H)=>G.get(H.id)?.vertex).map((H)=>H.id)),U=new Set(Z),X=new Set,K=new Set(F),$=null;if(Q==="selection_and_edges"){for(let H of z.cells)if(H.edge&&(H.source&&F.has(H.source)||H.target&&F.has(H.target)))U.add(H.id)}if(Q==="surrounding_layout"){let H=S6(z.cells);if(W.region){let V=Math.max(160,Math.min(320,Math.max(W.region.width,W.region.height)));$={x:W.region.x-V,y:W.region.y-V,width:W.region.width+V*2,height:W.region.height+V*2};for(let L of z.cells){if(!L.vertex)continue;let B=q5(L,H);if(B&&N1($,B))K.add(L.id)}}for(let V of W.cells){let L=G.get(V.id);if(!L?.edge)continue;if(L.source)K.add(L.source);if(L.target)K.add(L.target)}let q=new Set(K);for(let V of z.cells){if(!V.edge||!V.source||!V.target)continue;if(q.has(V.source)||q.has(V.target))K.add(V.source),K.add(V.target)}for(let V of K)U.add(V);for(let V of z.cells){if(!V.edge)continue;if(Z.has(V.id)||V.source&&V.target&&K.has(V.source)&&K.has(V.target))U.add(V.id)}}if(Q==="diagram_wide"){for(let H of Y)for(let q of H.cells)if(q.vertex||q.edge)X.add(`${H.id}:${q.id}`)}return{pages:Y,page:z,selectedIds:Z,selectedNodeIds:F,allowedIds:U,allowedQualifiedIds:X,allowedVertexIds:K,expandedRegion:$}}function k1(J){let W=J.activeAnnotationId;if(!W)return null;let Q=K5(J).get(W);if(!Q||Q.status!=="open")return J.annotationAuthorizations.delete(W),J.activeAnnotationId=null,null;return Q}function CJ(J,W,Q){let Y=k1(J);if(!Y){if(W)throw Error(`annotation ${W} is not active; restore or resolution invalidated its approval. Re-read the annotation and latest state with drawio_get_annotation, then request approval again before writing`);return null}if(!W||W!==Y.id)throw Error(`annotation ${Y.id} is active; formal writes require its annotation_id and a pre-approved approval_token`);let z=J.annotationAuthorizations.get(Y.id);if(!z||!Q||z.token!==Q)throw Error("annotation change has not been approved; call drawio_authorize_annotation_change and wait for the OpenCode approval popup before writing");if(z.consumedAt)throw Error("annotation approval token has already been used; request approval again before another write");if(z.sessionId!==J.sessionId||z.diagramKey!==g(J.file))throw Error("annotation approval belongs to a different diagram session; request approval again");if(z.baseRevision!==J.revision)throw Error(`annotation approval was granted for revision ${z.baseRevision}, but current revision is ${J.revision}; re-read, re-plan and request approval again`);return{task:Y,authorization:z,scope:D1(J,Y,z.scope)}}function r9(J,W,Q,Y){let{task:z,authorization:G,scope:Z}=J,F=new Set(G.proposedChangedIds),U=new Set(Q.filter((X)=>X.type==="add-node").map((X)=>X.id));for(let X of Q){let K=G.scope==="diagram_wide"?`${W}:${X.id}`:X.id;if(!F.has(K))throw Error(`annotation scope violation: ${K} was not disclosed in the approved change plan`);if(G.scope==="diagram_wide")continue;if(Z.allowedIds.has(X.id))continue;if(G.scope==="selection_and_edges"&&X.type==="add-edge"){if(X.source&&Z.selectedNodeIds.has(X.source)||X.target&&Z.selectedNodeIds.has(X.target))continue}if(G.scope==="surrounding_layout"&&X.type==="add-node"){if(!Z.expandedRegion||X.x===void 0||X.y===void 0)throw Error(`annotation scope violation: new node ${X.id} needs explicit x/y inside the approved surrounding region`);let $={x:X.x,y:X.y,width:X.width||160,height:X.height||70};if(N1(Z.expandedRegion,$))continue}if(G.scope==="surrounding_layout"&&X.type==="add-edge"){let $=!!X.source&&(Z.allowedVertexIds.has(X.source)||U.has(X.source)),H=!!X.target&&(Z.allowedVertexIds.has(X.target)||U.has(X.target));if($&&H)continue}throw Error(`annotation scope violation: ${X.id} is outside "${I5(G.scope)}" for ${z.id}; explain the need and request a wider approval before changing it`)}for(let X of Y){let K=G.scope==="diagram_wide"?`${W}:${X}`:X;if(!F.has(K))throw Error(`annotation scope violation: actual change ${K} was not disclosed in the approved plan`);if(G.scope==="diagram_wide")continue;let $=U.has(X)||Q.some((H)=>H.type==="add-edge"&&H.id===X);if(!Z.allowedIds.has(X)&&!$)throw Error(`annotation scope violation: actual change ${X} is outside the approved boundary`)}}function A3(J,W,Q){let Y=w6(W,Q),z=`${J.task.pageId}:`,G=[...[...Y.added,...Y.removed,...Y.changed].map((U)=>U.key),...Y.pageChanges.map((U)=>`${U.pageId}:@page`)],Z=J.authorization.scope==="diagram_wide"?G:G.map((U)=>U.startsWith(z)?U.slice(z.length):U),F=new Set(J.authorization.proposedChangedIds);for(let U of Z){if(!F.has(U))throw Error(`annotation scope violation: actual change ${U} was not disclosed in the approved plan`);if(!(J.authorization.scope==="diagram_wide"?J.scope.allowedQualifiedIds.has(U)||F.has(U):J.scope.allowedIds.has(U)))throw Error(`annotation scope violation: full-XML update changes ${U} outside "${I5(J.authorization.scope)}"; use scoped drawio_patch or request wider approval`)}return[...new Set(Z)]}async function AJ(J,W){W.authorization.consumedAt=new Date().toISOString(),W.task.updatedAt=W.authorization.consumedAt,await L8(J),B8(J,W.task,"updated")}function R3(J,W){if(W.status!=="open")return{stale:!1};if(W.baseFileHash&&W.baseFileHash===J.fileHash)return{stale:!1};if(!W.baseFileHash&&W.baseRevision>=J.revision)return{stale:!1};if(W.cells.length===0)return{stale:!1};let Q=J.history.find((z)=>z.revision===W.baseRevision),Y=Q&&(!W.baseFileHash||o(Q.xml)===W.baseFileHash)?Q:void 0;try{let z=Y?f(Y.xml):[],G=f(J.xml),Z=($)=>$.id===W.pageId,F=z.find(Z),U=G.find(Z);if(!U)return{stale:!0,reason:`page "${W.pageName||W.pageId}" no longer exists in the latest revision`};let X=F?new Map(F.cells.map(($)=>[$.id,$])):new Map,K=new Map(U.cells.map(($)=>[$.id,$]));for(let $ of W.cells){let H=X.get($.id),q=K.get($.id);if(!q)return{stale:!0,reason:`selected cell "${$.id}" was deleted since the annotation was created`};let V=W.baseCellHashes[`${W.pageId}:${$.id}`];if(V&&o(JSON.stringify(d5(q)))!==V)return{stale:!0,reason:`selected cell "${$.id}" changed since the annotation was created`};if(!V&&H&&JSON.stringify(d5(H))!==JSON.stringify(d5(q)))return{stale:!0,reason:`selected cell "${$.id}" changed since the annotation was created`};if(!V&&!H&&(($.label||"")!==(q.label||"")||($.source||"")!==(q.source||"")||($.target||"")!==(q.target||"")))return{stale:!0,reason:`selected cell "${$.id}" changed since the annotation was created`}}}catch{}return{stale:!1}}function N6(J,W){if(W.status!=="open")return{status:W.status,effectiveStatus:W.status,freshness:"fresh",requiresConfirmation:!1};let Q=R3(J,W);return{status:"open",effectiveStatus:Q.stale?"stale":"open",freshness:Q.stale?"stale":"fresh",requiresConfirmation:Q.stale,staleReason:Q.stale?Q.reason:void 0}}function S1(J,W){if(W==="all")return!0;if(W==="pending"||W==="open")return J.status==="open";if(W==="fresh")return J.status==="open"&&J.freshness==="fresh";if(W==="resolved")return J.status==="resolved";if(W==="ignored")return J.status==="ignored";if(W==="stale")return J.status==="open"&&J.freshness==="stale";return!1}function I1(J){let W={pending:0,open:0,fresh:0,stale:0,resolved:0,ignored:0,all:J.length};for(let Q of J)if(Q.status==="open")W.pending+=1,W.open+=1,W[Q.freshness]+=1;else W[Q.status]+=1;return W}function l5(J,W,Q=N6(J,W)){let Y=J.annotationAuthorizations.get(W.id)||null;return{id:W.id,file:W.file,page:{id:W.pageId,name:W.pageName},cells:W.cells,region:W.region,instruction:W.instruction,scope:W.scope,scopeLabel:I5(W.scope),authorization:Y?{scope:Y.scope,scopeLabel:I5(Y.scope),plan:Y.plan,proposedChangedIds:Y.proposedChangedIds,escalationReason:Y.escalationReason,baseRevision:Y.baseRevision,approvedAt:Y.approvedAt,consumedAt:Y.consumedAt}:null,status:Q.status,effectiveStatus:Q.effectiveStatus,freshness:Q.freshness,requiresConfirmation:Q.requiresConfirmation,stale:Q.freshness==="stale",staleReason:Q.staleReason||null,baseRevision:W.baseRevision,currentRevision:J.revision,result:W.result,createdAt:W.createdAt,updatedAt:W.updatedAt,resolvedAt:W.resolvedAt,ignoredAt:W.ignoredAt,ignoredReason:W.ignoredReason}}function B8(J,W,Q){let Y=b(),z=g(J.file);for(let G of Y.sessions.values()){if(g(G.file)!==z)continue;let Z=`event: annotation\\ndata: ${JSON.stringify({kind:Q,annotation:l5(G,W)})}

`,F=g(G.file);for(let U of Y.eventClients.get(G.sessionId)||[])if(U.diagramKey===F)U.response.write(Z)}}function a8(J,W){let Q=g(J.file);for(let Y of b().sessions.values()){if(g(Y.file)!==Q)continue;let z=Y.annotationAuthorizations.get(W);if(z?.previewId){let G=b().patchPreviews.get(z.previewId);if(G)I6(Y,G,"\u5173\u8054\u7684\u6807\u6CE8\u4EFB\u52A1\u5DF2\u7ED3\u675F")}if(Y.annotationAuthorizations.delete(W),Y.activeAnnotationId===W)Y.activeAnnotationId=null}}function T3(J){let W=new URL("/api/diagram",J.bridgeUrl);W.searchParams.set("sessionId",J.session.sessionId),W.searchParams.set("token",J.token);let Q=new URL("/api/events",J.bridgeUrl);Q.searchParams.set("sessionId",J.session.sessionId),Q.searchParams.set("token",J.token),Q.searchParams.set("file",E.relative(J.session.workspace,J.session.file).split(E.sep).join("/"));let Y=new URL("/api/annotations",J.bridgeUrl);Y.searchParams.set("sessionId",J.session.sessionId),Y.searchParams.set("token",J.token);let z=new URL("/api/history",J.bridgeUrl);z.searchParams.set("sessionId",J.session.sessionId),z.searchParams.set("token",J.token);let G=new URL("/api/preview",J.bridgeUrl);G.searchParams.set("sessionId",J.session.sessionId),G.searchParams.set("token",J.token);let Z=new URL("/api/editor-export",J.bridgeUrl);Z.searchParams.set("sessionId",J.session.sessionId),Z.searchParams.set("token",J.token);let F=tG({file:E.relative(J.session.workspace,J.session.file).split(E.sep).join("/"),drawioUrl:J.editorUrl.toString(),drawioOrigin:J.editorUrl.origin,apiUrl:W.toString(),eventsUrl:Q.toString(),annotationsUrl:Y.toString(),historyUrl:z.toString(),patchPreviewUrl:G.toString(),editorExportUrl:Z.toString()});return`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Draw.io - ${S5(E.basename(J.session.file))}</title>
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
      const CONFIG = ${F};
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
            : "\u8BF7\u6838\u5BF9\u753B\u5E03\u540E\u5728 OpenCode \u5BA1\u6279\u5F39\u7A97\u4E2D\u786E\u8BA4";
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
          : "\u8BF7\u6838\u5BF9\u753B\u5E03\u540E\u5728 OpenCode \u5BA1\u6279\u5F39\u7A97\u4E2D\u786E\u8BA4";
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
        const confirmed = window.confirm(
          "\u53D6\u6D88\u672C\u6B21\u4FEE\u6539\uFF1F\\n\\n\u53D6\u6D88\u540E\uFF0C\u672C\u6B21\u5019\u9009\u53CA\u5173\u8054\u5BA1\u6279\u5C06\u5931\u6548\uFF0C\u6E90 Draw.io \u6587\u4EF6\u4E0D\u4F1A\u53D1\u751F\u53D8\u5316\u3002",
        );
        if (!confirmed) return;
        const cancelUrl = new URL(CONFIG.patchPreviewUrl);
        cancelUrl.pathname = cancelUrl.pathname.endsWith("/")
          ? cancelUrl.pathname + encodeURIComponent(activePatchPreview.id)
          : cancelUrl.pathname + "/" + encodeURIComponent(activePatchPreview.id);
        const response = await fetch(cancelUrl.toString(), { method: "DELETE" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "\u53D6\u6D88\u5019\u9009\u5931\u8D25");
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
</html>`}async function E3(J,W){let Q=new URL(J.url||"/",`http://${J.headers.host||"localhost"}`),Y=b();if(J.method==="GET"&&Q.pathname==="/health"){k(W,200,{ok:!0,service:"drawio-integrated-bridge"});return}let z=J3(J);if(!z){k(W,401,{ok:!1,error:"invalid or expired session token"});return}let{session:G}=z;if(J.method==="GET"&&Q.pathname==="/editor"){let H=wJ(G.editorUrl||process.env.DRAWIO_WEB_URL?.trim()||"https://embed.diagrams.net"),q=new URL(`http://${Y.host}:${Y.port}`);W.writeHead(200,{"Cache-Control":"no-store","Content-Security-Policy":`default-src 'self'; frame-src ${H.origin}; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`,"Content-Type":"text/html; charset=utf-8"}),W.end(T3({session:G,editorUrl:H,bridgeUrl:q,["token"]:z.sessionKey}));return}if(J.method==="GET"&&Q.pathname==="/api/diagram"){await c(G),k(W,200,Z5(G));return}if(J.method==="PUT"&&Q.pathname==="/api/diagram"){let H;try{H=await F8(J)}catch(O){k(W,400,{ok:!1,error:O.message});return}let q=typeof H.xml==="string"?H.xml:"",V=H.baseRevision;if(!Number.isInteger(V)){k(W,400,{ok:!1,error:"baseRevision must be an integer"});return}if(q.includes(O5)){k(W,409,{ok:!1,error:"preview_artifact",message:"\u4E34\u65F6\u4FEE\u6539\u9884\u89C8\u4E0D\u80FD\u4FDD\u5B58\u5230\u6B63\u5F0F Draw.io \u6587\u4EF6"});return}let L=v5(G);if(H.source==="editor"&&L&&(o(q)===L.candidateHash||o(q)===o(L.comparePreviewXml))){k(W,409,{ok:!1,error:"preview_candidate",message:"\u53EA\u8BFB\u4FEE\u6539\u9884\u89C8\u5019\u9009\u4E0D\u80FD\u901A\u8FC7\u7F16\u8F91\u5668\u4FDD\u5B58\uFF0C\u5FC5\u987B\u5148\u5B8C\u6210\u5199\u524D\u5BA1\u6279"});return}let B=await H8(G,q,V,eG(H.source),typeof H.clientId==="string"?H.clientId:null,{autoMerge:H.source==="editor"});if(B.conflict){k(W,409,{ok:!1,error:"revision_conflict",current:Z5(B.current),manualChanges:B.manualChanges,merge:B.merge});return}if(B.invalid){k(W,422,{ok:!1,error:"invalid Draw.io XML",validation:B.report});return}k(W,200,{ok:!0,...Z5(B.document),validation:B.validation,autoMerge:B.autoMerge});return}if(J.method==="GET"&&Q.pathname==="/api/events"){W.writeHead(200,{"Cache-Control":"no-cache",Connection:"keep-alive","Content-Type":"text/event-stream; charset=utf-8"}),W.write(`: connected

`);let H=Q.searchParams.get("file"),q=H?P5({directory:G.workspace},H):G.file,V={response:W,diagramKey:g(q)},L=Y.eventClients.get(G.sessionId)||new Set;L.add(V),Y.eventClients.set(G.sessionId,L),J.on("close",()=>{if(L.delete(V),L.size===0)Y.eventClients.delete(G.sessionId)});return}if(J.method==="GET"&&Q.pathname==="/api/preview"){await c(G);let H=v5(G);k(W,200,{ok:!0,preview:H?U6(H,!0):null});return}let Z=Q.pathname.match(/^\/api\/preview\/([^/]+)$/),F=Z?decodeURIComponent(Z[1]):null;if(F&&J.method==="DELETE"){let H=Y.patchPreviews.get(F);if(!H||H.sessionId!==G.sessionId||H.diagramKey!==g(G.file)){k(W,404,{ok:!1,error:"patch preview not found"});return}I6(G,H,"\u7528\u6237\u53D6\u6D88\u4E86\u672C\u6B21\u5019\u9009\u4FEE\u6539"),k(W,200,{ok:!0,preview:U6(H)});return}if(J.method==="GET"&&Q.pathname==="/api/history"){await R1(G),await c(G);try{await $3(G)}catch(L){console.warn(`history reconcile failed for ${G.file}: ${L.message}`)}let H=null;try{H=await r5(G)}catch(L){G.historyWarning=`history disabled: ${L.message}`,console.warn(G.historyWarning),await T1(G),H=null}let q=H?[...H.entries].sort((L,B)=>B.sequence-L.sequence):[],V=H?[...H.entries].reverse().find((L)=>L.contentHash===G.fileHash)?.id??null:null;k(W,200,{ok:!0,file:E.relative(G.workspace,G.file).split(E.sep).join("/"),currentRevision:G.revision,currentSnapshotId:V,historyWarning:G.historyWarning,count:q.length,entries:q.map((L)=>({id:L.id,sequence:L.sequence,createdAt:L.createdAt,source:L.source,isCurrent:L.id===V,restoredFromSnapshotId:L.restoredFromSnapshotId,restoredFromSequence:L.restoredFromSnapshotId?H?.entries.find((B)=>B.id===L.restoredFromSnapshotId)?.sequence??null:null,pages:L.pages,previewState:L.previewState}))});return}let U=Q.pathname.match(/^\/api\/history\/([^/]+)\/preview$/);if(J.method==="GET"&&U){let H=decodeURIComponent(U[1]);if(!q8.test(H)){k(W,400,{ok:!1,error:"invalid snapshot id"});return}let q=Q.searchParams.get("pageId")||"",V=Q.searchParams.get("mode")||"thumb";if(V!=="thumb"&&V!=="preview"){k(W,400,{ok:!1,error:"mode must be thumb or preview"});return}if(!q){k(W,400,{ok:!1,error:"pageId is required"});return}try{let B=(await r5(G))?.entries.find((P)=>P.id===H);if(!B){k(W,404,{ok:!1,error:"snapshot not found"});return}if(!B.pages.some((P)=>P.id===q)){k(W,404,{ok:!1,error:"page not found in snapshot"});return}try{await hJ(G,H,B.contentHash)}catch(P){if(P.code==="ENOENT"){k(W,404,{ok:!1,error:"snapshot not found"});return}k(W,503,{ok:!1,error:"preview_unavailable",detail:P.message});return}let O=null,j=j1(G,H,q,V);try{O=await I.readFile(j)}catch(P){if(P.code!=="ENOENT")throw P}if(!O)try{O=await C1(G,H,q,V)}catch(P){if(/page not found in snapshot/.test(P.message)){k(W,404,{ok:!1,error:"page not found in snapshot"});return}k(W,503,{ok:!1,error:"preview_unavailable",detail:P.message});return}W.writeHead(200,{"Content-Type":"image/png","Cache-Control":"private, max-age=86400","Content-Length":String(O.length)}),W.end(O)}catch(L){k(W,500,{ok:!1,error:L.message})}return}let X=Q.pathname.match(/^\/api\/history\/([^/]+)\/restore$/);if(J.method==="POST"&&X){let H=decodeURIComponent(X[1]);if(!q8.test(H)){k(W,400,{ok:!1,error:"invalid snapshot id"});return}let q;try{q=await F8(J)}catch(B){k(W,400,{ok:!1,error:B.message});return}let V=q.baseRevision;if(!Number.isInteger(V)){k(W,400,{ok:!1,error:"baseRevision must be an integer"});return}let L=await V3(G,H,V,typeof q.clientId==="string"?q.clientId:null);if(L.conflict){k(W,409,{ok:!1,error:"revision_conflict",current:Z5(L.current)});return}if(L.invalid){if(L.error==="snapshot_not_found")k(W,404,{ok:!1,error:"snapshot_not_found"});else if(L.error==="current_snapshot")k(W,400,{ok:!1,error:"current_snapshot"});else k(W,422,{ok:!1,error:"snapshot_damaged",detail:L.error});return}if(L.checkpointFailed){k(W,500,{ok:!1,error:"current_checkpoint_failed",detail:L.error});return}if(L.partFailed){k(W,200,{ok:!0,partial:!0,message:L.message,...Z5(L.document)});return}k(W,200,{ok:!0,...Z5(L.document),snapshotId:L.snapshot.id,sequence:L.snapshot.sequence,restoredFromSnapshotId:L.snapshot.restoredFromSnapshotId,restoredFromSequence:L.restoredFromSequence,annotationInvalidationWarning:L.annotationInvalidationWarning});return}let K=Q.pathname.match(/^\/api\/annotations\/([^/]+)$/),$=K?decodeURIComponent(K[1]):null;if(J.method==="GET"&&Q.pathname==="/api/annotations"){await c(G);let H=K5(G),q=Q.searchParams.get("status")||"pending";if(!["pending","open","fresh","stale","resolved","ignored","all"].includes(q)){k(W,400,{ok:!1,error:`unsupported annotation status: ${q}`});return}let L=q,B=[...H.values()].map((j)=>({task:j,state:N6(G,j)})).sort((j,P)=>P.task.updatedAt.localeCompare(j.task.updatedAt)),O=B.filter((j)=>S1(j.state,L)).map((j)=>l5(G,j.task,j.state));k(W,200,{ok:!0,file:E.relative(G.workspace,G.file).split(E.sep).join("/"),status:L,count:O.length,counts:I1(B.map((j)=>j.state)),annotations:O});return}if(J.method==="POST"&&Q.pathname==="/api/annotations"){let H;try{H=await F8(J)}catch(R){k(W,400,{ok:!1,error:R.message});return}let q=typeof H.instruction==="string"?H.instruction.trim():"";if(!q){k(W,400,{ok:!1,error:"instruction must not be empty"});return}let V=typeof H.pageId==="string"?H.pageId:"",L=bJ(H.scope),B=Array.isArray(H.cells)?H.cells.filter((R)=>e(R)&&typeof R.id==="string").map((R)=>({id:String(R.id),kind:R.kind==="edge"?"edge":"node",label:typeof R.label==="string"?R.label:"",source:typeof R.source==="string"?R.source:void 0,target:typeof R.target==="string"?R.target:void 0})):[];if(B.length===0){k(W,400,{ok:!1,error:"select at least one cell before adding an annotation"});return}await c(G);let O=f(G.xml),j=V?O.find((R)=>R.id===V):O[0];if(!j){k(W,400,{ok:!1,error:V?`page "${V}" not found`:"the diagram has no pages to annotate",pages:O.map((R)=>({id:R.id,name:R.name}))});return}let P=new Map(j.cells.map((R)=>[R.id,R]));for(let R of B){let _=P.get(R.id);if(!_){k(W,400,{ok:!1,error:`cell "${R.id}" not found on page "${j.name||j.id}"`});return}if(R.kind==="node"&&!_.vertex){k(W,400,{ok:!1,error:`cell "${R.id}" is not a node on page "${j.name||j.id}"`});return}if(R.kind==="edge"&&!_.edge){k(W,400,{ok:!1,error:`cell "${R.id}" is not an edge on page "${j.name||j.id}"`});return}if(R.kind==="edge"&&_.edge){if(R.source!==void 0&&R.source!==(_.source??"")){k(W,400,{ok:!1,error:`edge "${R.id}" source mismatch: "${R.source}" does not match "${_.source??""}"`});return}if(R.target!==void 0&&R.target!==(_.target??"")){k(W,400,{ok:!1,error:`edge "${R.id}" target mismatch: "${R.target}" does not match "${_.target??""}"`});return}}}let M=j.id,T=typeof H.pageName==="string"?H.pageName:j.name||"",w=O3(O,M,B.map((R)=>R.id)),C=new Date().toISOString(),N={id:`ant_${i5(6).toString("base64url")}`,file:E.relative(G.workspace,G.file).split(E.sep).join("/"),pageId:M,pageName:T,cells:B,region:w,instruction:q,scope:L,status:"open",baseRevision:G.revision,baseFileHash:G.fileHash,baseCellHashes:C3(O,M,B.map((R)=>R.id)),result:null,createdAt:C,updatedAt:C,resolvedAt:null,ignoredAt:null,ignoredReason:null};K5(G).set(N.id,N),await L8(G),B8(G,N,"created"),k(W,201,{ok:!0,annotation:l5(G,N)});return}if($&&J.method==="GET"){await c(G);let q=K5(G).get($);if(!q){k(W,404,{ok:!1,error:"annotation not found"});return}k(W,200,{ok:!0,annotation:l5(G,q)});return}if($&&(J.method==="PATCH"||J.method==="PUT")){await c(G);let H=K5(G),q=H.get($);if(!q){k(W,404,{ok:!1,error:"annotation not found"});return}let V;try{V=await F8(J)}catch(B){k(W,400,{ok:!1,error:B.message});return}let L=typeof V.status==="string"?V.status:"";if((L==="resolved"||L==="ignored")&&q.status!=="open"){k(W,409,{ok:!1,error:`annotation is ${q.status}; reopen it before changing to ${L}`});return}if(L==="resolved"){let B=typeof V.summary==="string"?V.summary.trim():"",O=Array.isArray(V.changedIds)?V.changedIds.map((j)=>String(j)):[];q.status="resolved",q.result={summary:B||"resolved",changedIds:O,revision:G.revision,updatedAt:new Date().toISOString()},q.resolvedAt=q.result.updatedAt,q.ignoredAt=null,q.ignoredReason=null,a8(G,q.id)}else if(L==="ignored"){let B=typeof V.reason==="string"?V.reason.trim():"";q.status="ignored",q.result=null,q.resolvedAt=null,q.ignoredAt=new Date().toISOString(),q.ignoredReason=B||"\u5DF2\u7531\u7528\u6237\u624B\u52A8\u5FFD\u7565",a8(G,q.id)}else if(L==="open")a8(G,q.id),q.status="open",q.result=null,q.resolvedAt=null,q.ignoredAt=null,q.ignoredReason=null;else{k(W,400,{ok:!1,error:`unsupported annotation status: ${L||"(empty)"}`});return}q.updatedAt=new Date().toISOString(),H.set($,q),await L8(G),B8(G,q,"updated"),k(W,200,{ok:!0,annotation:l5(G,q)});return}if(J.method==="POST"&&Q.pathname==="/api/editor-export"){let H;try{H=await F8(J)}catch(j){k(W,400,{ok:!1,error:j.message});return}let q=typeof H.requestId==="string"?H.requestId:"",V=q?Y.pendingEditorExports.get(q):void 0;if(!V||V.sessionId!==G.sessionId||V.diagramKey!==g(G.file)){k(W,404,{ok:!1,error:"unknown editor export request"});return}let L=(j)=>{clearTimeout(V.timer),Y.pendingEditorExports.delete(q),V.reject(Error(j))};if(typeof H.error==="string"&&H.error){L(`editor export failed: ${H.error}`),k(W,200,{ok:!1,error:H.error});return}if(typeof H.data!=="string"||!H.data){L("editor export returned no data"),k(W,400,{ok:!1,error:"editor export data must be a non-empty data URI"});return}let B;try{B=mG(H.data)}catch(j){L(j.message),k(W,400,{ok:!1,error:j.message});return}try{if(B.length===0||B.length>X6)throw Error("editor export size is out of range");if(pG(B,V.format),V.writeOutput)await yJ(V.outputTarget,B,V.overwrite)}catch(j){L(j.message),k(W,400,{ok:!1,error:j.message});return}clearTimeout(V.timer),Y.pendingEditorExports.delete(q);let O={outputTarget:V.outputTarget,bytes:B.length,contentType:dG(V.format),content:V.writeOutput?void 0:B};V.resolve(O),k(W,200,{ok:!0,format:V.format,outputPath:E.relative(G.workspace,V.outputTarget).split(E.sep).join("/"),bytes:O.bytes});return}k(W,404,{ok:!1,error:"not found"})}function w3(){let J=process.env.DRAWIO_BRIDGE_HOST?.trim()||"127.0.0.1",W=process.env.DRAWIO_BRIDGE_PORT?.trim()||"0",Q=Number(W);if(!Number.isInteger(Q)||Q<0||Q>65535)throw Error(`invalid DRAWIO_BRIDGE_PORT: ${W}`);if(!["127.0.0.1","localhost","::1"].includes(J))throw Error("integrated Draw.io bridge must listen on loopback");return{host:J,port:Q}}async function N3(){let J=b();if(J.startPromise)return J.startPromise;let W=w3();return J.startPromise=new Promise((Q,Y)=>{let z=ZG((G,Z)=>{E3(G,Z).catch((F)=>{if(!Z.headersSent)k(Z,500,{ok:!1,error:F.message});else Z.end()})});z.once("error",(G)=>{J.startPromise=null,Y(G)}),z.listen(W.port,W.host,()=>{let G=z.address();if(!G||typeof G==="string"){J.startPromise=null,Y(Error("integrated Draw.io bridge did not bind a TCP port"));return}J.server=z,J.host=W.host,J.port=G.port,Q({host:W.host,port:G.port})})}),J.startPromise}async function DJ(J,W){let Q=b6(J),Y=await C5(W),z=l(f(Y));if(!z.valid)throw Error(`refusing to open invalid diagram: ${JSON.stringify(z.errors)}`);let G=b(),Z=G.sessions.get(J.sessionID),F=Z&&E.resolve(Z.file)===E.resolve(W)?await c(Z):{sessionId:J.sessionID,bindingId:i5(16).toString("base64url"),workspace:Q,file:W,revision:0,xml:Y,fileHash:o(Y),updatedBy:"initial",updatedAt:new Date().toISOString(),history:[{revision:0,xml:Y,updatedBy:"initial",updatedAt:new Date().toISOString()}],backupFile:null,activeAnnotationId:null,activePreviewId:null,annotationAuthorizations:new Map,historyWarning:null};G.sessions.set(J.sessionID,F),F.bindingId??=i5(16).toString("base64url"),F.activeAnnotationId??=null,F.activePreviewId??=null,F.annotationAuthorizations??=new Map,await B3(F),await q3(F);let U=await N3(),X=i5(24).toString("base64url");return G.tokens.set(X,{sessionId:J.sessionID,diagramKey:g(F.file),bindingId:F.bindingId,expiresAt:Date.now()+$8}),{session:F,token:X,bridge:U}}var D3=`## Draw.io \u6587\u4EF6\u5199\u5165\u4E0E\u4EA4\u4ED8

\u5DF2\u901A\u8FC7 drawio_open \u7ED1\u5B9A\u7684\u6587\u4EF6\u53EF\u80FD\u5305\u542B\u7528\u6237\u5728\u5185\u7F6E\u6D4F\u89C8\u5668\u4E2D\u7684\u624B\u52A8\u4FEE\u6539\u3002
\u53EA\u8981\u5F53\u524D\u4F1A\u8BDD\u5DF2\u901A\u8FC7 drawio_open \u6216 drawio_finalize \u7ED1\u5B9A .drawio \u6587\u4EF6\uFF0C\u6BCF\u4E00\u8F6E\u5BF9\u8BDD\u5F00\u59CB\u3001\u5728\u51B3\u5B9A\u672C\u8F6E\u52A8\u4F5C\u6216\u56DE\u590D\u524D\uFF0C\u90FD\u5FC5\u987B\u5E76\u53D1\u8C03\u7528 drawio_list_annotations(file, status="pending") \u548C drawio_get_state\uFF0C\u5408\u5E76\u68C0\u67E5\u5F85\u5904\u7406\u6CE8\u91CA\u3001\u6700\u65B0 revision\u3001updatedBy \u4EE5\u53CA\u4EBA\u5DE5/\u5916\u90E8\u7248\u672C\u53D8\u52A8\u3002\u6B64\u8981\u6C42\u4E0D\u4F9D\u8D56\u672C\u8F6E\u662F\u5426\u91CD\u65B0\u52A0\u8F7D Skill\uFF1B\u7528\u6237\u53EA\u8BF4\u201C\u55EF\u201D\u201C\u7EE7\u7EED\u201D\u201C\u597D\u4E86\u5417\u201D\u7B49\u7B80\u77ED\u56DE\u590D\u65F6\u4E5F\u4E0D\u5F97\u8DF3\u8FC7\u3002\u82E5\u7528\u6237\u672C\u8F6E\u6709\u5176\u5B83\u660E\u786E\u4EFB\u52A1\uFF0C\u5B8C\u6210\u540E\u5FC5\u987B\u5728\u540C\u4E00\u8F6E\u91CD\u65B0\u6267\u884C\u8FD9\u4E24\u9879\u63A2\u6D4B\u5E76\u91CD\u65B0\u8BA1\u7B97 freshness\uFF1B\u6700\u7EC8\u56DE\u590D\u524D\u518D\u6B21\u5217\u51FA pending \u6CE8\u91CA\uFF0C\u4E0D\u5F97\u9057\u7559\u53EF\u76F4\u63A5\u6267\u884C\u7684 fresh \u6CE8\u91CA\uFF0C\u9664\u975E\u7528\u6237\u660E\u786E\u8981\u6C42\u6682\u4E0D\u5904\u7406\u3001\u6CE8\u91CA\u9700\u8981\u786E\u8BA4\u6216\u5DE5\u5177\u5931\u8D25\u3002
\u6BCF\u6B21\u4FEE\u6539\u524D\u5FC5\u987B\u7ACB\u5373\u8C03\u7528 drawio_get_state\uFF0C\u5E76\u628A\u8FD4\u56DE\u7684\u6700\u65B0 XML \u4F5C\u4E3A\u4FEE\u6539\u57FA\u7EBF\u3002\u4EBA\u5DE5\u7F16\u8F91\u4E0D\u662F\u53EA\u8BFB\u5185\u5BB9\uFF0C\u53EF\u4EE5\u6309\u5F53\u524D\u4EFB\u52A1\u8981\u6C42\u7EE7\u7EED\u8C03\u6574\u3002
\u63D0\u4EA4\u65F6\u5FC5\u987B\u643A\u5E26\u8BE5\u6B21\u8BFB\u53D6\u8FD4\u56DE\u7684\u51C6\u786E base_revision\uFF1Brevision_conflict \u540E\u91CD\u65B0\u8BFB\u53D6\uFF0C\u5728\u65B0 XML \u4E0A\u91CD\u65B0\u6267\u884C\u6240\u9700\u53D8\u66F4\u5E76\u91CD\u8BD5\uFF0C\u7981\u6B62\u91CD\u53D1\u65E7 XML\u3002
\u7981\u6B62\u7528\u666E\u901A write\u3001edit \u6216\u811A\u672C\u76F4\u63A5\u8986\u76D6\u5DF2\u7ED1\u5B9A\u7684 .drawio \u6587\u4EF6\uFF0C\u56E0\u4E3A\u8FD9\u4F1A\u7ED5\u8FC7 revision \u68C0\u67E5\u5E76\u53EF\u80FD\u7528\u65E7\u5FEB\u7167\u4E22\u5931\u6700\u65B0\u5185\u5BB9\u3002
\u5BF9\u5DF2\u7ED1\u5B9A\u6587\u4EF6\u6267\u884C drawio_patch \u6216 drawio_polish \u65F6\uFF0C\u5148\u4EE5 dry_run=true \u751F\u6210\u540C\u753B\u5E03\u4FEE\u6539\u9884\u89C8\uFF1B\u5B57\u4F53\u3001\u586B\u5145\u8272\u3001\u6587\u5B57\u8272\u3001\u8FB9\u6846\u8272\u7B49\u5E38\u7528\u5C5E\u6027\u4F7F\u7528 drawio_patch.style_updates\u3002\u53EA\u6709\u5B8C\u6574 XML \u624D\u80FD\u8868\u8FBE\u7684\u9875\u9762\u80CC\u666F\u6216\u9AD8\u7EA7\u6837\u5F0F\u5148\u8C03\u7528 drawio_preview_state\uFF0C\u7981\u6B62\u76F4\u63A5\u8C03\u7528 drawio_update_state \u7ED5\u8FC7\u9884\u89C8\u3002\u9884\u89C8\u63D0\u4F9B\u201C\u4FEE\u6539\u524D\u201D\uFF08\u539F\u59CB\u57FA\u7EBF\uFF09\u3001\u201C\u4FEE\u6539\u540E\u201D\uFF08\u65E0\u4E34\u65F6\u6807\u8BB0\u7684\u7CBE\u786E\u5019\u9009\uFF09\u548C\u201C\u5BF9\u6BD4\u201D\uFF08\u5019\u9009\u52A0\u5F69\u8272\u8986\u76D6\u5C42\uFF0C\u9ED8\u8BA4\uFF09\u4E09\u79CD\u89C6\u56FE\u53CA\u5C5E\u6027\u7EA7\u524D\u540E\u503C\uFF1B\u7EFF\u8272\u8868\u793A\u65B0\u589E\u3001\u9EC4\u8272\u8868\u793A\u4FEE\u6539\u3001\u7EA2\u8272\u8868\u793A\u5220\u9664\u6216\u539F\u4F4D\u7F6E\u3001\u84DD\u8272\u8868\u793A\u53D8\u66F4\u8FDE\u7EBF\u3002\u5173\u95ED\u53D8\u5316\u8BE6\u60C5\u53EA\u6536\u8D77\u9762\u677F\uFF0C\u4E0D\u5F71\u54CD\u5019\u9009\uFF1B\u201C\u53D6\u6D88\u672C\u6B21\u4FEE\u6539\u201D\u3001\u62D2\u7EDD\u6216\u5173\u95ED\u5BA1\u6279\u624D\u4F1A\u4F7F\u5019\u9009\u5931\u6548\u3002\u666E\u901A\u4FEE\u6539\u8C03\u7528 drawio_authorize_preview\uFF1B\u7528\u6237\u5728\u5BA1\u6279\u5F39\u7A97\u70B9\u51FB\u5141\u8BB8\u540E\uFF0C\u8BE5\u5DE5\u5177\u4F1A\u7ACB\u5373\u6821\u9A8C\u5E76\u63D0\u4EA4\u753B\u5E03\u4E2D\u5C55\u793A\u7684\u7CBE\u786E\u5019\u9009\uFF0CAgent \u4E0D\u5F97\u7B49\u5F85\u7528\u6237\u518D\u53D1\u6587\u5B57\u786E\u8BA4\uFF0C\u4E5F\u4E0D\u5F97\u91CD\u590D\u8C03\u7528\u6B63\u5F0F patch/polish\u3002\u6CE8\u91CA\u4FEE\u6539\u7EE7\u7EED\u8C03\u7528 drawio_authorize_annotation_change\uFF0C\u5E76\u628A dry-run \u8FD4\u56DE\u7684 preview_id \u4E0E\u7CBE\u786E\u7A33\u5B9A ID \u6E05\u5355\u4E00\u8D77\u7EB3\u5165\u8303\u56F4\u5BA1\u6279\u3002
\u672C\u8F6E\u5168\u90E8\u53EF\u6267\u884C\u521B\u5EFA\u6216\u4FEE\u6539\uFF08\u5305\u62EC fresh annotation\uFF09\u5B8C\u6210\u540E\u5FC5\u987B\u7EDF\u4E00\u8C03\u7528 drawio_finalize\uFF1A\u6821\u9A8C\u3001\u8BC4\u5206\u3001\u81EA\u52A8\u5BFC\u51FA\u540C\u540D PNG\u3002\u8C03\u7528\u524D\u5FC5\u987B\u5148\u8C03\u7528 drawio_list_annotations(status='pending') \u63A2\u6D4B\u672A\u5B8C\u6210\u6CE8\u91CA\uFF1B\u5B58\u5728 requiresConfirmation=false \u7684\u6CE8\u91CA\u65F6 drawio_finalize \u4F1A\u62D2\u7EDD\u6267\u884C\uFF0C\u5FC5\u987B\u5148\u9010\u6761\u5904\u7406\u5E76 drawio_resolve_annotation \u540E\u518D\u91CD\u8BD5\uFF0C\u4E0D\u5F97\u8DF3\u8FC7\u3002\u53EA\u6709\u8FD4\u56DE shouldOpenBrowser=true \u65F6\u624D\u8C03\u7528 MobileWork \u5DE5\u5177 openwork_browser_open_url\uFF0C\u5E76\u4F20\u5165 url=openUrl\u3001provider="builtin"\uFF1BeditorConnected=true \u65F6\u5FC5\u987B\u4FDD\u6301\u73B0\u6709\u7F16\u8F91\u5668\uFF0C\u7981\u6B62\u91CD\u65B0\u6253\u5F00\u6216\u5237\u65B0\uFF0C\u4EE5\u514D\u4E22\u5931\u7528\u6237\u5C1A\u672A\u4FDD\u5B58\u7684\u7F16\u8F91\u3002
drawio_export \u652F\u6301 PNG\u3001JPEG\u3001PDF\u3001xmlpng\u3001SVG\u3001xmlsvg \u548C html2\u3002SVG\u3001xmlsvg\u3001html2 \u7531\u5185\u7F6E\u6D4F\u89C8\u5668\u7F16\u8F91\u5668\u6E32\u67D3\u5E76\u901A\u8FC7 Bridge \u5199\u56DE\u5DE5\u4F5C\u533A\uFF1B\u8FD4\u56DE editor_required \u65F6\u5FC5\u987B\u7ACB\u5373\u8C03\u7528 openwork_browser_open_url\uFF0C\u5E76\u4F20\u5165 url=openUrl\u3001provider="builtin"\uFF0C\u7B49\u5F85\u7F16\u8F91\u5668\u8FDE\u63A5\u540E\u7528\u5B8C\u5168\u76F8\u540C\u7684\u53C2\u6570\u91CD\u8BD5\uFF0C\u7981\u6B62\u628A\u8BE5\u72B6\u6001\u89E3\u91CA\u4E3A\u4E0D\u652F\u6301\u683C\u5F0F\u6216\u8981\u6C42\u7528\u6237\u624B\u5DE5\u5BFC\u51FA\u3002PNG\u3001JPEG\u3001xmlpng\u3001SVG\u3001xmlsvg \u4F7F\u7528 all_pages=true \u65F6\u9010\u9875\u751F\u6210\u6587\u4EF6\u5E76\u8FD4\u56DE outputs[]\uFF0C\u5FC5\u987B\u6838\u5BF9 page_count \u4E0E outputs \u6570\u91CF\u4E00\u81F4\uFF1BPDF \u548C html2 \u7684 all_pages=true \u5404\u8FD4\u56DE\u4E00\u4E2A\u5305\u542B\u5168\u90E8\u9875\u9762\u7684\u591A\u9875\u5355\u6587\u4EF6\uFF0Chtml2 \u8FD8\u9700\u6838\u5BF9 contains_all_pages=true\u3002

## \u6CE8\u91CA\u4EFB\u52A1\uFF08\u6846\u9009\u8BC4\u5BA1\uFF09

\u7528\u6237\u5728\u5185\u7F6E\u6D4F\u89C8\u5668\u4E2D\u6846\u9009\u56FE\u5143\u5E76\u63D0\u4EA4\u6CE8\u91CA\u540E\uFF0C\u6BCF\u6761\u6CE8\u91CA\u662F\u4E00\u6761\u6309\u56FE\u8868\u6587\u4EF6\u6301\u4E45\u5316\u7684\u72EC\u7ACB\u4EFB\u52A1\uFF0C\u4E0D\u7ED1\u5B9A\u521B\u5EFA\u5B83\u7684\u5BF9\u8BDD session\uFF1B\u4EFB\u52A1\u8BB0\u5F55\u7A33\u5B9A ID\u3001\u9875\u9762\u3001\u533A\u57DF\u8303\u56F4\u3001\u4FEE\u6539\u8BF4\u660E\u3001\u5141\u8BB8\u8303\u56F4\u548C\u63D0\u4EA4\u65F6\u7684\u56FE\u8868\u57FA\u7EBF\u3002
\u6CE8\u91CA\u7684\u6301\u4E45\u5316 status \u4E3A open/resolved/ignored\uFF1Bfreshness=stale \u8868\u793A\u56FE\u5143\u5DF2\u53D8\u5316\u4F46\u4EFB\u52A1\u4ECD\u672A\u5B8C\u6210\u3002\u6267\u884C stale \u6CE8\u91CA\u524D\u5FC5\u987B\u5148\u8BE2\u95EE\u7528\u6237\uFF1Bfresh \u6CE8\u91CA\u53EF\u76F4\u63A5\u8FDB\u5165\u8BA1\u5212\u548C\u5BA1\u6279\u6D41\u7A0B\u3002resolved \u548C ignored \u90FD\u662F\u7EC8\u6001\uFF0CAgent \u5FC5\u987B\u8DF3\u8FC7\uFF0C\u53EA\u6709\u7528\u6237\u91CD\u65B0\u6253\u5F00\u540E\u624D\u80FD\u5904\u7406\u3002
\u5904\u7406\u6CE8\u91CA\u65F6\u5FC5\u987B\u5148\u8BFB\u53D6\u6700\u65B0\u72B6\u6001\u5E76 dry-run\uFF0C\u8BA9\u5019\u9009\u7ED3\u679C\u663E\u793A\u5728\u540C\u4E00 Draw.io \u753B\u5E03\u4E2D\uFF1B\u5411\u7528\u6237\u8BF4\u660E\u8BA1\u5212\u3001\u5B8C\u6574\u7A33\u5B9A ID \u6E05\u5355\u548C\u8303\u56F4\u540E\uFF0C\u643A\u5E26 preview_id \u8C03\u7528 drawio_authorize_annotation_change\u3002\u8BE5\u5DE5\u5177\u5FC5\u987B\u7531 OpenCode \u4EE5 ask \u6743\u9650\u5F39\u7A97\u5728\u5199\u5165\u524D\u6279\u51C6\uFF1B\u6279\u51C6\u540E\u624D\u53EF\u628A\u5F53\u524D session \u7684\u4E00\u6B21\u6027 token \u4F20\u7ED9\u6B63\u5F0F drawio_patch/drawio_update_state\uFF0C\u4E14\u5199\u5165 XML \u5FC5\u987B\u4E0E\u5DF2\u5C55\u793A\u5019\u9009\u5B8C\u5168\u4E00\u81F4\u3002\u975E\u5168\u56FE\u8303\u56F4\u7531\u8FD0\u884C\u65F6\u5F3A\u5236\u4F7F\u7528\u6CE8\u91CA\u7ED1\u5B9A\u7684 pageId\uFF1Bdiagram_wide \u8986\u76D6\u5F53\u524D\u56FE\u8868\u5168\u90E8\u9875\u9762\u5E76\u4F7F\u7528 pageId:cellId\u3002\u7981\u6B62\u5148\u6539\u540E\u95EE\u3002
\u4E0D\u5F97\u4FEE\u6539\u6388\u6743\u8303\u56F4\u5916\u5185\u5BB9\u3002\u786E\u9700\u8D8A\u754C\u65F6\uFF0C\u5728 authorization \u7684 escalation_reason \u4E2D\u5148\u8BF4\u660E\u4E0D\u53EF\u907F\u514D\u7684\u539F\u56E0\u5E76\u7533\u8BF7\u66F4\u5BBD\u8303\u56F4\uFF1B\u672A\u83B7\u6279\u51C6\u4E0D\u5F97\u5199\u5165\u3002drawio_polish \u4F1A\u91CD\u6392\u6574\u9875\uFF0C\u5B58\u5728\u6D3B\u52A8\u6CE8\u91CA\u65F6\u53EA\u6709\u53D6\u5F97 diagram_wide \u5BA1\u6279\u540E\u624D\u80FD\u6B63\u5F0F\u8FD0\u884C\u3002
\u7528\u6237\u672C\u8F6E\u53E6\u6709\u660E\u786E\u4EFB\u52A1\u65F6\u5148\u5B8C\u6210\u8BE5\u4EFB\u52A1\uFF0C\u7136\u540E\u5728\u540C\u4E00\u8F6E\u91CD\u65B0\u63A2\u6D4B\u6CE8\u91CA\uFF1B\u6700\u7EC8\u56DE\u590D\u524D\u4ECD\u5B58\u5728 requiresConfirmation=false \u7684 open \u6CE8\u91CA\u65F6\u5FC5\u987B\u7EE7\u7EED\u5904\u7406\uFF0C\u4E0D\u80FD\u53EA\u63D0\u793A\u7528\u6237\u7A0D\u540E\u7EE7\u7EED\u3002
\u6CE8\u91CA\u4EFB\u52A1\u7684\u68C0\u67E5\u4E0E\u5904\u7406\u6D41\u7A0B\u7531 drawio-session-editing \u6280\u80FD\u8D1F\u8D23\u7F16\u6392\uFF0C\u8BE6\u89C1\u8BE5 SKILL.md\u3002`,k3="Agent ID \u662F `drawio-expert`";function S3(J){return J.some((W)=>W.includes(k3))}function I3(J){if(!J||typeof J!=="object"||Array.isArray(J))return null;let W=J;for(let Q of["filePath","file_path","path","file"])if(typeof W[Q]==="string"&&W[Q].toLowerCase().endsWith(".drawio"))return W[Q];return null}async function xU(J){await OG(J)}function hU(J){if(!S3(J.system))return;J.system.push(D3)}function uU(J,W){if(!["write","edit","apply_patch"].includes(J.tool))return;let Q=I3(W.args);if(!Q)return;let z=b().sessions.get(J.sessionID);if(!z)return;if((E.isAbsolute(Q)?E.resolve(Q):E.resolve(z.workspace,Q)).toLowerCase()===E.resolve(z.file).toLowerCase())throw Error("This Draw.io file is bound to an active browser session. Call drawio_get_state, then use drawio_patch, drawio_polish, or drawio_update_state with its exact revision.")}var gU=["drawio_validate","drawio_export","drawio_health_check","drawio_create","drawio_inspect","drawio_quality","drawio_patch","drawio_polish","drawio_compare","drawio_get_state","drawio_preview_state","drawio_update_state","drawio_open","drawio_finalize","drawio_list_annotations","drawio_get_annotation","drawio_authorize_preview","drawio_authorize_annotation_change","drawio_resolve_annotation"],o9=new WeakMap;function y3(J){let W=o9.get(J);if(W)return W;let Q=J,Y=Q.schema.object({id:Q.schema.string().describe("Stable unique cell id; 0 and 1 are reserved"),label:Q.schema.string().describe("Visible node label"),kind:Q.schema.enum(["default","application","service","database","external","decision"]).optional().describe("Visual node category")}),z=Q.schema.object({id:Q.schema.string().optional().describe("Stable unique edge id"),source:Q.schema.string().describe("Source node id"),target:Q.schema.string().describe("Target node id"),label:Q.schema.string().optional().describe("Visible edge label")}),G=Q.schema.object({font_size:Q.schema.number().positive().max(200).optional(),font_family:Q.schema.string().min(1).max(120).optional(),font_color:Q.schema.string().min(1).max(80).optional(),fill_color:Q.schema.string().min(1).max(80).optional(),stroke_color:Q.schema.string().min(1).max(80).optional(),stroke_width:Q.schema.number().min(0).max(50).optional(),opacity:Q.schema.number().min(0).max(100).optional(),rounded:Q.schema.boolean().optional(),dashed:Q.schema.boolean().optional()}),Z=Q.schema.object({type:Q.schema.enum(["add-node","update-node","remove-node","add-edge","update-edge","remove-edge"]),id:Q.schema.string().describe("Stable target or new cell id"),label:Q.schema.string().optional(),kind:Q.schema.enum(["default","application","service","database","external","decision"]).optional(),source:Q.schema.string().optional(),target:Q.schema.string().optional(),x:Q.schema.number().optional(),y:Q.schema.number().optional(),width:Q.schema.number().positive().optional(),height:Q.schema.number().positive().optional(),style_updates:G.optional().describe("Whitelisted visual property updates that preserve unrelated style keys"),cascade:Q.schema.boolean().optional().describe("For remove-node, also remove connected edges")}),F={drawio_validate:Q({description:"Validate a workspace Draw.io file and report pages, file size, nodes, edges, errors, and warnings.",args:{input_path:Q.schema.string().describe("Workspace-relative .drawio or .xml file")},async execute(U,X){let K=P5(X,U.input_path),$=k5(X,K),H=$?(await c($)).xml:await C5(K),q=f(H),V=await I.stat(K);return JSON.stringify({success:!0,input_path:h(X,K),file_size_bytes:V.size,is_valid_drawio:!0,page_count:q.length,pages:q.map((L)=>({id:L.id,name:L.name,compressed:L.compressed,nodes:L.cells.filter((B)=>B.vertex).length,edges:L.cells.filter((B)=>B.edge).length})),...l(q)},null,2)}}),drawio_export:Q({description:"Export a workspace Draw.io file. PNG, JPEG, PDF, and editable PNG (xmlpng) use the Docker HTTP Export Server. SVG, editable SVG (xmlsvg), and HTML (html2) use the built-in browser Bridge. all_pages=true writes one file per page for PNG/JPEG/xmlpng/SVG/XMLSVG, while PDF and HTML2 each produce one multi-page file. page_id exports one page for every format. When an editor-channel export is not connected, call openwork_browser_open_url with url=openUrl and provider=builtin, then retry the same export.",args:{input_path:Q.schema.string().describe("Workspace-relative .drawio or .xml input file"),format:Q.schema.enum(["png","jpeg","pdf","xmlpng","svg","xmlsvg","html2"]),output_path:Q.schema.string().optional().describe("Workspace-relative output path"),page_id:Q.schema.string().optional().describe("Stable page id to export; cannot be combined with all_pages"),all_pages:Q.schema.boolean().default(!1).describe("Export every page; multi-file formats return outputs[], while PDF and HTML2 return one multi-page file"),scale:Q.schema.number().positive().default(1),border:Q.schema.number().int().min(0).default(0),background:Q.schema.string().default(RJ).describe("Export background color; defaults to white to avoid transparent PNG previews"),embed_xml:Q.schema.boolean().default(!1),overwrite:Q.schema.boolean().default(!1)},async execute(U,X){let K=P5(X,U.input_path),$=k5(X,K),H=$?await c($):null,q=H?.xml||await C5(K),V=H?.revision,L=l(f(q));if(!L.valid)throw Error(`refusing to export invalid Draw.io XML: ${JSON.stringify(L.errors)}`);if(U.page_id&&U.all_pages)throw Error("page_id and all_pages cannot be used together");if(Z1.has(U.format)){let O=U.page_id?q1(q,U.page_id):null;if(U.all_pages&&X1.has(U.format)){let M=await rG({context:X,inputTarget:K,xml:q,format:U.format,outputPath:U.output_path,sourceRevision:V,overwrite:U.overwrite});if(M.status==="editor_required")return JSON.stringify({status:"editor_required",message:"SVG and HTML exports are rendered by the Draw.io editor page in the built-in browser, which is currently not connected for this diagram.",input_path:h(X,K).split(E.sep).join("/"),format:U.format,all_pages:!0,openUrl:M.openUrl,browserAction:"Call openwork_browser_open_url with url=openUrl and provider=builtin now, wait for the editor page to finish loading, then call drawio_export again with identical arguments to complete the export.",tokenExpiresAt:M.tokenExpiresAt},null,2);return JSON.stringify({success:!0,channel:"editor",input_path:h(X,K).split(E.sep).join("/"),format:U.format,all_pages:!0,page_count:M.outputs.length,source_revision:M.sourceRevision,outputs:M.outputs.map((T)=>({page_index:T.pageIndex,page_id:T.pageId,page_name:T.pageName,output_path:h(X,T.outputTarget).split(E.sep).join("/"),file_size_bytes:T.bytes,content_type:T.contentType}))},null,2)}let j=U.page_id?U.format==="html2"?gG(q,U.page_id):q:U.all_pages?q:void 0,P=await V1({context:X,inputTarget:K,format:U.format,outputPath:U.output_path,xml:j,pageId:U.page_id,allPages:U.all_pages,sourceRevision:V,overwrite:U.overwrite});if(P.status==="editor_required")return JSON.stringify({status:"editor_required",message:"SVG and HTML exports are rendered by the Draw.io editor page in the built-in browser, which is currently not connected for this diagram.",input_path:h(X,K).split(E.sep).join("/"),format:U.format,openUrl:P.openUrl,browserAction:"Call openwork_browser_open_url with url=openUrl and provider=builtin now, wait for the editor page to finish loading, then call drawio_export again with identical arguments to complete the export.",tokenExpiresAt:P.tokenExpiresAt},null,2);return JSON.stringify({success:!0,channel:"editor",input_path:h(X,K).split(E.sep).join("/"),output_path:h(X,P.outputTarget).split(E.sep).join("/"),format:U.format,file_size_bytes:P.bytes,content_type:P.contentType,page_id:O?.id,page_name:O?.name,all_pages:U.all_pages,page_count:U.all_pages&&U.format==="html2"?L.stats.pages:void 0,contains_all_pages:U.all_pages&&U.format==="html2"?!0:void 0,source_revision:P.sourceRevision},null,2)}if(U.all_pages&&K1.has(U.format)){let O=await iG({context:X,inputTarget:K,xml:q,format:U.format,outputPath:U.output_path,scale:U.scale,border:U.border,background:U.background,embedXml:U.format==="xmlpng"||U.embed_xml,overwrite:U.overwrite});return JSON.stringify({success:!0,channel:"docker",input_path:h(X,K).split(E.sep).join("/"),format:U.format,all_pages:!0,page_count:O.length,outputs:O.map((j)=>({page_index:j.pageIndex,page_id:j.pageId,page_name:j.pageName,output_path:h(X,j.outputTarget).split(E.sep).join("/"),file_size_bytes:j.bytes,content_type:j.contentType,export_url:j.exportUrl}))},null,2)}let B=await m9({context:X,inputTarget:K,xml:q,format:U.format,outputPath:U.output_path,pageId:U.page_id,allPages:U.all_pages,scale:U.scale,border:U.border,background:U.background,embedXml:U.format==="xmlpng"||U.embed_xml,overwrite:U.overwrite});return JSON.stringify({success:!0,channel:"docker",input_path:h(X,K).split(E.sep).join("/"),output_path:h(X,B.outputTarget).split(E.sep).join("/"),format:U.format,file_size_bytes:B.bytes,content_type:B.contentType,export_url:B.exportUrl,all_pages:U.all_pages,page_count:U.all_pages?L.stats.pages:void 0},null,2)}}),drawio_health_check:Q({description:"Check the TypeScript Draw.io runtime and Docker Export Server; deep=true performs a real PNG export.",args:{deep:Q.schema.boolean().default(!1)},async execute(U,X){let K=Y0(),$=await oG(),H={success:$.reachable,checks:{runtime:{status:"ok",implementation:"opencode-typescript-plugin"},workspace:{root:b6(X)},export_server:{url:K.url.toString(),...$},supported_formats:["html2","jpeg","pdf","png","svg","xmlpng","xmlsvg"],export_channels:{docker_export_server:["jpeg","pdf","png","xmlpng"],builtin_browser_editor:["html2","svg","xmlsvg"]},configuration:{timeout_seconds:K.timeoutMs/1000,max_input_size_mb:X6/1024/1024,max_output_size_mb:K.maxOutputBytes/1024/1024}}};if(U.deep&&$.reachable)try{let q=u9("HealthCheck",[{id:"health",label:"OK",kind:"default"}],[],"left-to-right",!1),V=await G0(q,"png");H.checks.deep_test={success:!0,format:"png",content_type:V.contentType,size_bytes:V.content.length}}catch(q){H.success=!1,H.checks.deep_test={success:!1,error:q.message}}else if(U.deep)H.checks.deep_test={success:!1,error:"export server is not reachable"};return JSON.stringify(H,null,2)}}),drawio_create:Q({description:"Create a validated Draw.io file from a semantic graph. Use this instead of writing mxGraphModel XML directly.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml output path"),title:Q.schema.string().describe("Diagram page title"),nodes:Q.schema.array(Y).describe("Diagram nodes"),edges:Q.schema.array(z).default([]).describe("Diagram edges"),direction:Q.schema.enum(["left-to-right","top-to-bottom"]).default("left-to-right").describe("Layered layout direction"),compressed:Q.schema.boolean().default(!1).describe("Write standard compressed Draw.io page payload"),overwrite:Q.schema.boolean().default(!1).describe("Allow replacement; the previous file is preserved as a timestamped backup")},async execute(U,X){NG(U.nodes,U.edges);let K=P5(X,U.file);if(k5(X,K))throw Error("active Draw.io sessions cannot be replaced by drawio_create; call drawio_get_state and submit an incremental revision-aware update");let $=u9(U.title,U.nodes,U.edges,U.direction,U.compressed),H=f($),q=l(H);if(!q.valid)throw Error(`generated diagram failed validation: ${JSON.stringify(q.errors)}`);let V=await r8(K,$,U.overwrite);return JSON.stringify({created:h(X,K),backup:V.backup?h(X,V.backup):null,compressed:U.compressed,...q},null,2)}}),drawio_inspect:Q({description:"Inspect a compressed or uncompressed Draw.io file and return pages, nodes, edges, geometry, and styles.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file")},async execute(U,X){let K=P5(X,U.file),$=k5(X,K),H=$?(await c($)).xml:await C5(K),q=f(H);return JSON.stringify({file:h(X,K),pages:q.map((V)=>({id:V.id,name:V.name,compressed:V.compressed,nodes:V.cells.filter((L)=>L.vertex),edges:V.cells.filter((L)=>L.edge)})),...l(q)},null,2)}}),drawio_quality:Q({description:"Score Draw.io layout quality and report actionable issues including node overlaps, edge-node intersections, edge crossings, edge-label collisions, empty labels, and missing arc line jumps.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file"),threshold:Q.schema.number().min(0).max(100).default(90).describe("Minimum accepted quality score")},async execute(U,X){let K=P5(X,U.file),$=k5(X,K),H=$?(await c($)).xml:await C5(K),q=f(H);return JSON.stringify({file:h(X,K),...p8(q,U.threshold)},null,2)}}),drawio_patch:Q({description:"Apply semantic node and edge operations, including whitelisted font, color, stroke, opacity and shape-style updates, to an existing Draw.io file. Pass annotation_id when executing an annotation so its bound page is enforced. Preserves unrelated cells and creates a recoverable backup unless dry_run is true.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file"),page:Q.schema.string().optional().describe("Page id or name; defaults to the first page unless annotation_id enforces the annotation page"),annotation_id:Q.schema.string().optional().describe("Annotation being executed; binds the target page and is mandatory for a formal annotation-driven write"),operations:Q.schema.array(Z).min(1).describe("Ordered semantic operations"),dry_run:Q.schema.boolean().default(!1).describe("Return the diff and validation result without writing"),base_revision:Q.schema.number().int().min(0).optional().describe("Exact revision returned by drawio_get_state; mandatory when writing an active session"),approval_token:Q.schema.string().optional().describe("One-time token returned after drawio_authorize_annotation_change is approved"),preview_id:Q.schema.string().optional().describe("Preview id returned by the immediately preceding active-session dry-run"),preview_approval_token:Q.schema.string().optional().describe("One-time token returned by drawio_authorize_preview; annotation approval_token also authorizes its linked preview")},async execute(U,X){let K=P5(X,U.file),$=k5(X,K),H=$?await c($):null,q=U.page;if(U.annotation_id){if(!H)throw Error("annotation_id requires an active Draw.io session for this file");let N=K5(H).get(U.annotation_id);if(!N)throw Error(`annotation not found: ${U.annotation_id}`);if(N.status!=="open")throw Error(`annotation is ${N.status} and must be reopened before processing: ${U.annotation_id}`);if(!N.pageId.trim())throw Error(`annotation has no stable page id: ${U.annotation_id}`);if(N.scope!=="diagram_wide"&&U.page&&U.page!==N.pageId&&U.page!==N.pageName)throw Error(`annotation ${U.annotation_id} is bound to page ${N.pageId}; received page ${U.page}`);q=N.scope==="diagram_wide"&&U.page?U.page:N.pageId}if(H&&!U.dry_run&&U.base_revision===void 0)throw Error("base_revision is required for an active Draw.io session; call drawio_get_state immediately before writing");let V=H&&!U.dry_run?CJ(H,U.annotation_id,U.approval_token):null,L=H?.xml||await C5(K),B=f(L),O=Z6(L),j=_9(O,q),P=EG(j,U.operations);if(V)r9(V,j.id,U.operations,P);let M=V8(O),T=f(M),w=l(T);if(!w.valid)throw Error(`patched diagram failed validation: ${JSON.stringify(w.errors)}`);let C=w6(B,T);if(U.dry_run){let N=H?OJ(H,L,M,j.id,P,C):null;return JSON.stringify({file:U.file,dryRun:!0,changedIds:P,diff:C,preview:N?U6(N):null,previewGuidance:N?"The exact candidate is visible in the bound Draw.io canvas. Review it before authorization.":"Bind the file with drawio_open or drawio_finalize to receive an interactive canvas preview.",...w},null,2)}if(H){let N=U.preview_id||V?.authorization.previewId||H.activePreviewId||void 0,A=l8(H,N,U.preview_approval_token||U.approval_token,U.base_revision,M),R=await H8(H,M,U.base_revision,"agent",null,{appliedPreviewId:A.id});if(R.conflict)return JSON.stringify({file:U.file,dryRun:!1,...R},null,2);if(R.invalid)throw Error(`patched diagram failed validation: ${JSON.stringify(R.report.errors)}`);if(V)await AJ(H,V);return JSON.stringify({file:h(X,K),dryRun:!1,backup:H.backupFile?h(X,H.backupFile):null,revision:H.revision,changedIds:P,diff:C,...w},null,2)}let D=await r8(K,M,!0);return JSON.stringify({file:h(X,K),dryRun:!1,backup:D.backup?h(X,D.backup):null,changedIds:P,diff:C,...w},null,2)}}),drawio_polish:Q({description:"Run a deterministic quality loop: analyze, auto-layout and reroute a page, validate the result, enforce a quality threshold, and optionally write with backup.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file"),page:Q.schema.string().optional().describe("Page id or name; defaults to the first page"),direction:Q.schema.enum(["left-to-right","top-to-bottom"]).default("left-to-right").describe("Layered layout direction"),threshold:Q.schema.number().min(0).max(100).default(90).describe("Minimum quality score required before writing"),dry_run:Q.schema.boolean().default(!0).describe("Analyze and preview the complete diff without writing"),base_revision:Q.schema.number().int().min(0).optional().describe("Exact revision returned by drawio_get_state; mandatory when writing an active session"),annotation_id:Q.schema.string().optional().describe("Active annotation id; whole-page polish requires diagram_wide approval"),approval_token:Q.schema.string().optional().describe("One-time diagram_wide token returned by drawio_authorize_annotation_change"),preview_id:Q.schema.string().optional().describe("Preview id returned by the dry-run"),preview_approval_token:Q.schema.string().optional().describe("One-time token returned by drawio_authorize_preview")},async execute(U,X){let K=P5(X,U.file),$=k5(X,K),H=$?await c($):null;if(H&&!U.dry_run&&U.base_revision===void 0)throw Error("base_revision is required for an active Draw.io session; call drawio_get_state immediately before writing");let q=H&&!U.dry_run?CJ(H,U.annotation_id,U.approval_token):null;if(q&&q.authorization.scope!=="diagram_wide")throw Error("drawio_polish may relayout the whole page and requires diagram_wide annotation approval; use scoped drawio_patch or request wider approval");let V=H?.xml||await C5(K),L=f(V),B=p8(L,U.threshold),O=Z6(V),j=_9(O,U.page),P=xG(j,U.direction);if(q)r9(q,j.id,[],P);let M=V8(O),T=f(M),w=p8(T,U.threshold),C=w6(L,T),D={file:h(X,K),dryRun:U.dry_run,accepted:w.pass,changedIds:P,diff:C,beforeQuality:B,afterQuality:w};if(U.dry_run){let A=H?OJ(H,V,M,j.id,P,C):null;return JSON.stringify({...D,backup:null,preview:A?U6(A):null},null,2)}if(!w.pass)throw Error(`polished diagram did not meet quality threshold ${U.threshold}; score=${w.score}, issues=${JSON.stringify(w.issues)}`);let N;if(H){let A=U.preview_id||q?.authorization.previewId||H.activePreviewId||void 0,R=l8(H,A,U.preview_approval_token||U.approval_token,U.base_revision,M),_=await H8(H,M,U.base_revision,"agent",null,{appliedPreviewId:R.id});if(_.conflict)return JSON.stringify({...D,conflict:!0,current:Z5(_.current),manualChanges:_.manualChanges},null,2);if(_.invalid)throw Error(`polished diagram failed validation: ${JSON.stringify(_.report.errors)}`);if(q)await AJ(H,q);N={backup:H.backupFile}}else N=await r8(K,M,!0);return JSON.stringify({...D,backup:N.backup?h(X,N.backup):null},null,2)}}),drawio_compare:Q({description:"Compare two Draw.io files by stable page and cell ids, reporting added, removed, changed, and unchanged nodes and edges.",args:{before:Q.schema.string().describe("Workspace-relative baseline .drawio, .xml, or plugin-created .bak file"),after:Q.schema.string().describe("Workspace-relative updated .drawio, .xml, or plugin-created .bak file")},async execute(U,X){let K=s8(X,U.before,f9),$=s8(X,U.after,f9),H=f(await C5(K)),q=f(await C5($));return JSON.stringify({before:h(X,K),after:h(X,$),diff:w6(H,q),beforeStats:l(H).stats,afterStats:l(q).stats},null,2)}}),drawio_get_state:Q({description:"Read the latest XML and revision for the current session's active Draw.io file. Use this before changing a user-edited diagram.",args:{since_revision:Q.schema.number().int().min(0).optional().describe("Optionally report stable-ID changes since this revision")},async execute(U,X){let K=b().sessions.get(X.sessionID);if(!K)throw Error("No active Draw.io session. Call drawio_open first.");await c(K);let $=Z5(K);if(U.since_revision!==void 0)$.changesSince=o8(K,U.since_revision);return JSON.stringify($,null,2)}}),drawio_preview_state:Q({description:"Preview an exact complete-XML candidate in the active Draw.io canvas without writing it. Use when semantic drawio_patch operations cannot express the requested change, including page backgrounds or advanced styles.",args:{base_revision:Q.schema.number().int().min(0).describe("Exact revision returned by the immediately preceding drawio_get_state call"),xml:Q.schema.string().min(1).describe("Complete candidate Draw.io XML"),annotation_id:Q.schema.string().optional().describe("Open annotation task this candidate is intended to address")},async execute(U,X){let K=b().sessions.get(X.sessionID);if(!K)throw Error("No active Draw.io session. Call drawio_open first.");if(await c(K),U.base_revision!==K.revision)return JSON.stringify({ok:!1,error:"revision_conflict",current:Z5(K),manualChanges:o8(K,U.base_revision)},null,2);if(U.annotation_id){let j=K5(K).get(U.annotation_id);if(!j)throw Error(`annotation not found: ${U.annotation_id}`);if(j.status!=="open")throw Error(`annotation is ${j.status} and must be reopened before previewing`)}if(U.xml.includes(O5))throw Error("formal Draw.io XML must not contain reserved preview artifacts");let $=f(U.xml),H=l($);if(!H.valid)return JSON.stringify({ok:!1,error:"invalid_drawio_xml",validation:H},null,2);let q=f(K.xml),V=w6(q,$);if(V.summary.added+V.summary.removed+V.summary.changed+V.pageChanges.length===0)throw Error("candidate XML is identical to the active diagram");let B=V.changed[0]?.pageId||(V.added[0]?y6(V.added[0].key,V.added[0].cell.id):void 0)||(V.removed[0]?y6(V.removed[0].key,V.removed[0].cell.id):void 0)||V.pageChanges[0]?.pageId||$[0]?.id||q[0]?.id||"page-1",O=OJ(K,K.xml,U.xml,B,[],V);return JSON.stringify({ok:!0,dryRun:!0,file:E.relative(K.workspace,K.file).split(E.sep).join("/"),changedIds:O.changedIds,changedQualifiedIds:O.changedQualifiedIds,affectedPageIds:O.affectedPageIds,diff:V,preview:U6(O),validation:H,previewGuidance:"The exact complete-XML candidate is visible in the bound Draw.io canvas. Compare Before and After, inspect the property list, then authorize the preview."},null,2)}}),drawio_update_state:Q({description:"Apply the exact complete-XML candidate from an approved drawio_preview_state preview. The candidate hash and base revision must match; a stale revision is rejected.",args:{base_revision:Q.schema.number().int().min(0),xml:Q.schema.string().min(1),annotation_id:Q.schema.string().optional().describe("Active annotation id; mandatory for an annotation-driven write"),approval_token:Q.schema.string().optional().describe("One-time token returned after drawio_authorize_annotation_change is approved"),preview_id:Q.schema.string().optional().describe("Preview id from drawio_preview_state; annotation approval may supply its linked preview"),preview_approval_token:Q.schema.string().optional().describe("Preview approval token; annotation approval_token also authorizes its linked preview")},async execute(U,X){let K=b().sessions.get(X.sessionID);if(!K)throw Error("No active Draw.io session. Call drawio_open first.");if(await c(K),U.base_revision!==K.revision)return JSON.stringify({ok:!1,error:"revision_conflict",current:Z5(K),manualChanges:o8(K,U.base_revision)},null,2);if(o(U.xml)===K.fileHash)return JSON.stringify({ok:!0,...Z5(K),validation:l(f(K.xml)),noOp:!0},null,2);let $=CJ(K,U.annotation_id,U.approval_token);if($)A3($,f(K.xml),f(U.xml));let H=U.preview_id||$?.authorization.previewId||void 0,q=l8(K,H,U.preview_approval_token||U.approval_token,U.base_revision,U.xml),V=await H8(K,U.xml,U.base_revision,"agent",null,{appliedPreviewId:q.id});if(V.conflict)return JSON.stringify({ok:!1,error:"revision_conflict",current:Z5(V.current),manualChanges:V.manualChanges},null,2);if(V.invalid)return JSON.stringify({ok:!1,error:"invalid_drawio_xml",validation:V.report},null,2);if($)await AJ(K,$);return JSON.stringify({ok:!0,...Z5(V.document),validation:V.validation},null,2)}}),drawio_open:Q({description:"Bind the current Draw.io session to one validated workspace file and return a URL for OpenWork's existing built-in browser.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file to open"),drawio_url:Q.schema.string().optional().describe("Draw.io Web URL; defaults to DRAWIO_WEB_URL or https://embed.diagrams.net")},async execute(U,X){let K=P5(X,U.file),$=await DJ(X,K),H=wJ(U.drawio_url?.trim()||process.env.DRAWIO_WEB_URL?.trim()||"https://embed.diagrams.net");$.session.editorUrl=H.toString();let q=`http://${$.bridge.host}:${$.bridge.port}`,V=new URL("/editor",q);V.searchParams.set("sessionId",X.sessionID),V.searchParams.set("token",$.token);let L=J0($.session.sessionId,K);return JSON.stringify({ok:!0,file:h(X,K).split(E.sep).join("/"),sessionId:X.sessionID,revision:$.session.revision,openUrl:V.toString(),editorUrl:H.toString(),editorConnected:L,shouldOpenBrowser:!L,browserAction:L?"Keep the connected editor open. Do not call openwork_browser_open_url because reopening it can discard an in-progress manual edit.":"Call openwork_browser_open_url with url=openUrl and provider=builtin.",saveMode:"workspace-file",tokenExpiresAt:new Date(Date.now()+$8).toISOString()},null,2)}}),drawio_finalize:Q({description:"Finish a Draw.io task: refresh the latest revision, validate and score it, export an up-to-date PNG, bind the browser session, and report whether a new editor must be opened. Refuses to run while any fresh (requiresConfirmation=false) annotation is still open; returns pendingAnnotations for stale open annotations that still need user confirmation. Resolved and ignored annotations are terminal and do not block finalization.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file"),output_path:Q.schema.string().optional().describe("Workspace-relative PNG path; defaults to the input basename with .png"),threshold:Q.schema.number().min(0).max(100).default(90),scale:Q.schema.number().positive().default(1),border:Q.schema.number().int().min(0).default(0),background:Q.schema.string().default(RJ).describe("PNG background color; defaults to white"),drawio_url:Q.schema.string().optional().describe("Draw.io Web URL; defaults to DRAWIO_WEB_URL or https://embed.diagrams.net")},async execute(U,X){let K=P5(X,U.file),$=k5(X,K),H=$?(await c($)).xml:await C5(K),q=f(H),V=l(q);if(!V.valid)throw Error(`refusing to finalize invalid Draw.io XML: ${JSON.stringify(V.errors)}`);let L=p8(q,U.threshold),B=await DJ(X,K),O=[...K5(B.session).values()].filter((N)=>N.status==="open"),j=O.filter((N)=>!N6(B.session,N).requiresConfirmation);if(j.length>0)throw Error(`refusing to finalize: ${j.length} unfinished fresh annotation(s) must be handled first \u2014 `+j.map((N)=>`${N.id}: ${N.instruction.slice(0,120)}`).join(" | ")+". Handle each one (plan, get approval, write, then drawio_resolve_annotation) before calling drawio_finalize again.");let P=O.map((N)=>{let A=N6(B.session,N);return{id:N.id,instruction:N.instruction,requiresConfirmation:A.requiresConfirmation,freshness:A.freshness}}),M=await m9({context:X,inputTarget:K,xml:H,format:"png",outputPath:U.output_path,scale:U.scale,border:U.border,background:U.background,overwrite:!0}),T=wJ(U.drawio_url?.trim()||process.env.DRAWIO_WEB_URL?.trim()||"https://embed.diagrams.net");B.session.editorUrl=T.toString();let w=`http://${B.bridge.host}:${B.bridge.port}`,C=new URL("/editor",w);C.searchParams.set("sessionId",X.sessionID),C.searchParams.set("token",B.token);let D=J0(B.session.sessionId,K);return JSON.stringify({ok:!0,file:h(X,K).split(E.sep).join("/"),revision:B.session.revision,validation:V,quality:L,png:{output_path:h(X,M.outputTarget).split(E.sep).join("/"),file_size_bytes:M.bytes,content_type:M.contentType,export_url:M.exportUrl},pendingAnnotations:P,openUrl:C.toString(),editorUrl:T.toString(),editorConnected:D,shouldOpenBrowser:!D,browserAction:D?"Keep the connected editor open. Do not call openwork_browser_open_url because reopening it can discard an in-progress manual edit.":"Immediately call openwork_browser_open_url with url=openUrl and provider=builtin before ending the task.",saveMode:"workspace-file",tokenExpiresAt:new Date(Date.now()+$8).toISOString()},null,2)}}),drawio_list_annotations:Q({description:"List annotation (review comment) tasks for an opened Draw.io file. Each task contains selected stable cell ids, page, region, user-selected modification scope, instruction, approval state and status.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file bound to the session"),status:Q.schema.enum(["pending","open","fresh","stale","resolved","ignored","all"]).default("pending").describe("Filter by status; pending/open return all unfinished tasks, while fresh and stale refine them")},async execute(U,X){let K=P5(X,U.file),$=k5(X,K);if(!$)throw Error("No active Draw.io session for this file. Call drawio_open first.");await c($);let q=[...K5($).values()].map((L)=>({task:L,state:N6($,L)})).sort((L,B)=>B.task.updatedAt.localeCompare(L.task.updatedAt)),V=q.filter((L)=>S1(L.state,U.status)).map((L)=>l5($,L.task,L.state));return JSON.stringify({file:h(X,K).split(E.sep).join("/"),sessionId:$.sessionId,currentRevision:$.revision,count:V.length,counts:I1(q.map((L)=>L.state)),annotations:V,guidance:"Pending/open include fresh and stale unfinished tasks; resolved and ignored are terminal until the user reopens them. Ask for confirmation before executing any task with requiresConfirmation=true. For each executable task: call drawio_get_annotation and drawio_get_state, dry-run, disclose scope and exact stable IDs with drawio_authorize_annotation_change, and wait for its OpenCode approval popup. Only then pass annotation_id and the one-time approval token to one scoped write, resolve the annotation, and finalize. Never modify first and ask later."},null,2)}}),drawio_get_annotation:Q({description:"Read one annotation task in full and make it the active guarded task, including selected stable cell ids, region, user-selected scope, instruction, base revision, staleness and latest per-cell snapshots.",args:{file:Q.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),id:Q.schema.string().describe("Annotation id returned by drawio_list_annotations")},async execute(U,X){let K=d8(X,U.file);if(!K)throw Error("No active Draw.io session. Call drawio_open first.");await c(K);let H=K5(K).get(U.id);if(!H)throw Error(`annotation not found: ${U.id}`);K.activeAnnotationId=H.status==="open"?H.id:null;let q=N6(K,H),V=l5(K,H,q),L=[];try{let B=f(K.xml),O=B.find((j)=>j.id===H.pageId)||B[0];if(O){let j=new Map(O.cells.map((P)=>[P.id,P]));L=H.cells.map((P)=>{let M=j.get(P.id);if(!M)return{id:P.id,missing:!0};let T=M.vertex?q5(M,S6(O.cells)):null;return{id:M.id,kind:M.edge?"edge":"node",label:M.label||"",style:M.style||"",source:M.source,target:M.target,geometry:T||null,parent:M.parent}})}}catch{}return JSON.stringify({annotation:V,cellSnapshots:L,guidance:H.status!=="open"?`This annotation is ${H.status} and terminal. Do not process it unless the user reopens it in the annotation panel.`:q.requiresConfirmation?"This annotation is stale but still open. Ask the user whether to execute it. After confirmation, call drawio_get_state, generate a dry-run canvas preview and exact changed-id plan, then call drawio_authorize_annotation_change with the preview id. Wait for the OpenCode approval popup before applying the exact hash-matched candidate; resolve only after the write succeeds.":"Call drawio_get_state, generate a dry-run canvas preview and exact changed-id plan, then call drawio_authorize_annotation_change with the preview id. After approval, apply the exact hash-matched candidate and resolve the annotation."},null,2)}}),drawio_authorize_preview:Q({description:"Request approval for the exact candidate visible in the Draw.io canvas and apply it immediately when the user allows the popup. Use after drawio_patch/drawio_polish dry-run or drawio_preview_state, and only for changes that are not driven by an annotation task.",args:{file:Q.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),preview_id:Q.schema.string().describe("Preview id returned by drawio_patch/drawio_polish dry-run or drawio_preview_state"),plan:Q.schema.string().min(1).describe("Concise explanation of the visible candidate change")},async execute(U,X){let K=d8(X,U.file);if(!K)throw Error("No active Draw.io session. Call drawio_open first.");if(await c(K),k1(K))throw Error("an annotation task is active; authorize its scoped preview with drawio_authorize_annotation_change instead");let $=b().patchPreviews.get(U.preview_id);if(!$||$.sessionId!==K.sessionId||$.diagramKey!==g(K.file))throw Error("patch preview not found for this session and diagram");if(v5(K),$.status!=="pending")throw Error(`patch preview is ${$.status}; generate a fresh dry-run preview`);let H=["drawio-preview",o($.diagramKey).slice(0,12),$.id,`revision-${$.baseRevision}`,$.candidateHash.slice(0,16)].join(":");try{await X.ask({permission:"drawio_authorize_preview",patterns:[H],always:[H],metadata:{file:$.file,previewId:$.id,plan:U.plan.trim(),baseRevision:$.baseRevision,candidateHash:$.candidateHash,changedIds:$.changedIds,summary:$.diff.summary}})}catch(L){throw I6(K,$,"\u7528\u6237\u62D2\u7EDD\u6216\u5173\u95ED\u4E86\u4FEE\u6539\u5BA1\u6279"),L}await c(K);let q=i5(24).toString("base64url");i9(K,$,q),l8(K,$.id,q,$.baseRevision,$.candidateXml);let V=await H8(K,$.candidateXml,$.baseRevision,"agent",null,{appliedPreviewId:$.id});if(V.conflict)return v5(K),JSON.stringify({ok:!1,applied:!1,error:"revision_conflict",current:Z5(V.current),manualChanges:V.manualChanges},null,2);if(V.invalid)throw Error(`approved preview failed validation: ${JSON.stringify(V.report.errors)}`);return JSON.stringify({ok:!0,applied:!0,file:E.relative(K.workspace,K.file).split(E.sep).join("/"),revision:V.document.revision,backup:V.document.backupFile?E.relative(K.workspace,V.document.backupFile).split(E.sep).join("/"):null,validation:V.validation,preview:U6($),guidance:"The approved preview was applied immediately. Do not call drawio_patch or drawio_polish again for this candidate; finalize the diagram if an updated export is required."},null,2)}}),drawio_authorize_annotation_change:Q({description:"Request the user's pre-change approval for one annotation plan. OpenCode must show its permission popup before this tool runs. If approved, returns a one-time token bound to the current revision, declared stable IDs and requested scope. Never call after modifying the diagram.",args:{file:Q.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),id:Q.schema.string().describe("Annotation id returned by drawio_get_annotation"),plan:Q.schema.string().min(1).describe("Concrete pre-change explanation of what will be modified"),proposed_changed_ids:Q.schema.array(Q.schema.string()).min(1).describe("Complete stable-ID allowlist disclosed before writing; diagram_wide uses pageId:cellId"),requested_scope:Q.schema.enum(["selection_only","selection_and_edges","surrounding_layout","diagram_wide"]).describe("Scope needed by this plan; normally equal to or narrower than the user's annotation scope"),escalation_reason:Q.schema.string().optional().describe("Required when requesting a scope wider than the user originally selected"),preview_id:Q.schema.string().optional().describe("Preview id returned by the immediately preceding drawio_patch dry-run; defaults to the active preview")},async execute(U,X){let K=d8(X,U.file);if(!K)throw Error("No active Draw.io session. Call drawio_open first.");await c(K);let $=K5(K).get(U.id);if(!$)throw Error(`annotation not found: ${U.id}`);if($.status!=="open")throw Error(`annotation is ${$.status} and must be reopened before authorization: ${U.id}`);let H=bJ(U.requested_scope),q=U.escalation_reason?.trim()||null;if(p9(H)>p9($.scope)&&!q)throw Error(`scope escalation from "${I5($.scope)}" to "${I5(H)}" requires an explicit reason shown before approval`);let V=[...new Set(U.proposed_changed_ids.map((T)=>T.trim()))].filter(Boolean);if(V.length===0)throw Error("proposed_changed_ids must contain at least one stable id");let L=D1(K,$,H),B=U.preview_id?b().patchPreviews.get(U.preview_id):v5(K);if(B){if(B.sessionId!==K.sessionId||B.diagramKey!==g(K.file))throw Error("patch preview belongs to a different session or diagram");if(v5(K),B.status!=="pending")throw Error(`patch preview is ${B.status}; generate a fresh dry-run preview`);let T=H==="diagram_wide"?new Set(B.changedQualifiedIds):new Set(B.changedIds),w=new Set(V);if(T.size!==w.size||[...T].some((C)=>!w.has(C)))throw Error("proposed_changed_ids must exactly match the stable IDs shown in the active preview")}let O=E.relative(K.workspace,K.file).split(E.sep).join("/"),j=["annotation",o(g(K.file)).slice(0,12),$.id,`revision-${K.revision}`,H,V.toSorted().join(",")].join(":");try{await X.ask({permission:"drawio_authorize_annotation_change",patterns:[j],always:[j],metadata:{annotationId:$.id,file:O,plan:U.plan.trim(),proposedChangedIds:V,requestedScope:H,requestedScopeLabel:I5(H),originalScope:$.scope,originalScopeLabel:I5($.scope),escalationReason:q,baseRevision:K.revision,previewId:B?.id||null,candidateHash:B?.candidateHash||null}})}catch(T){if(B)I6(K,B,"\u7528\u6237\u62D2\u7EDD\u6216\u5173\u95ED\u4E86\u6CE8\u91CA\u4FEE\u6539\u5BA1\u6279");throw T}await c(K);let P=new Date().toISOString(),M={token:i5(24).toString("base64url"),sessionId:K.sessionId,diagramKey:g(K.file),scope:H,plan:U.plan.trim(),proposedChangedIds:V,escalationReason:q,baseRevision:K.revision,approvedAt:P,consumedAt:null,previewId:B?.id||null};if(K.annotationAuthorizations.set($.id,M),B)i9(K,B,M.token);return $.updatedAt=P,K.activeAnnotationId=$.id,await L8(K),B8(K,$,"authorization-approved"),JSON.stringify({ok:!0,annotationId:$.id,approvalToken:M.token,previewId:B?.id||null,baseRevision:M.baseRevision,requestedScope:H,requestedScopeLabel:I5(H),originalScope:$.scope,originalScopeLabel:I5($.scope),escalationReason:q,proposedChangedIds:V,allowedExistingIds:H==="diagram_wide"?[...L.allowedQualifiedIds]:[...L.allowedIds],guidance:"Approval is valid for one formal write at this exact revision. Pass annotation_id and approval_token to drawio_patch or drawio_update_state. Any undeclared or out-of-scope stable ID is rejected."},null,2)}}),drawio_resolve_annotation:Q({description:"Mark an annotation task as resolved after the requested change has been written (or after deciding no change is needed). This updates status and stores a summary; it does not modify the diagram itself.",args:{file:Q.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),id:Q.schema.string().describe("Annotation id to resolve"),summary:Q.schema.string().describe("Short description of what was changed or why the annotation needs no change"),changed_ids:Q.schema.array(Q.schema.string()).optional().describe("Stable cell ids that were added, removed or modified for this annotation")},async execute(U,X){let K=d8(X,U.file);if(!K)throw Error("No active Draw.io session. Call drawio_open first.");await c(K);let $=K5(K),H=$.get(U.id);if(!H)throw Error(`annotation not found: ${U.id}`);if(H.status!=="open")throw Error(`annotation is ${H.status} and must be reopened before it can be resolved: ${U.id}`);let q=new Date().toISOString();return H.status="resolved",H.result={summary:U.summary,changedIds:U.changed_ids||[],revision:K.revision,updatedAt:q},H.resolvedAt=q,H.ignoredAt=null,H.ignoredReason=null,H.updatedAt=q,$.set(H.id,H),a8(K,H.id),await L8(K),B8(K,H,"updated"),JSON.stringify({ok:!0,annotation:l5(K,H)},null,2)}})};return o9.set(J,F),F}function cU(J,W){let Y=y3(W)[J];if(!Y)throw Error(`Unknown Draw.io tool: ${J}`);return Y}export{xU as initializeDrawioWorkspace,uU as enforceDrawioWriteGuard,y3 as createDrawioToolset,cU as createDrawioTool,hU as applyDrawioSystemGuidance,gU as DRAWIO_TOOL_NAMES};

// @bun
import{promises as I}from"fs";import{createHash as Q0,randomBytes as i5,randomUUID as a9}from"crypto";import{createServer as KG}from"http";import{createConnection as XG}from"net";import w from"path";var d1=":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040",l1="[:A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD]["+d1+"]*",i1=new RegExp("^"+l1+"$");function B8(J,W){let Q=[],G=W.exec(J);while(G){let z=[];z.startIndex=W.lastIndex-G[0].length;let Y=G.length;for(let Z=0;Z<Y;Z++)z.push(G[Z]);Q.push(z),G=W.exec(J)}return Q}var Z0=function(J){let W=i1.exec(J);return!(W===null||typeof W>"u")};function mJ(J){return typeof J<"u"}var v6=["hasOwnProperty","toString","valueOf","__defineGetter__","__defineSetter__","__lookupGetter__","__lookupSetter__"],j8=["__proto__","constructor","prototype"];var n1={allowBooleanAttributes:!1,unpairedTags:[]};function M8(J,W){W=Object.assign({},n1,W);let Q=[],G=!1,z=!1;if(J[0]==="\uFEFF")J=J.substr(1);for(let Y=0;Y<J.length;Y++)if(J[Y]==="<"&&J[Y+1]==="?"){if(Y+=2,Y=dJ(J,Y),Y.err)return Y}else if(J[Y]==="<"){let Z=Y;if(Y++,J[Y]==="!"){Y=lJ(J,Y);continue}else{let K=!1;if(J[Y]==="/")K=!0,Y++;let $="";for(;Y<J.length&&J[Y]!==">"&&J[Y]!==" "&&J[Y]!=="\t"&&J[Y]!==`
`&&J[Y]!=="\r";Y++)$+=J[Y];if($=$.trim(),$[$.length-1]==="/")$=$.substring(0,$.length-1),Y--;if(!QQ($)){let H;if($.trim().length===0)H="Invalid space after '<'.";else H="Tag '"+$+"' is an invalid name.";return d("InvalidTag",H,Q5(J,Y))}let U=a1(J,Y);if(U===!1)return d("InvalidAttr","Attributes for '"+$+"' have open quote.",Q5(J,Y));let X=U.value;if(Y=U.index,X[X.length-1]==="/"){let H=Y-X.length;X=X.substring(0,X.length-1);let F=iJ(X,W);if(F===!0)G=!0;else return d(F.err.code,F.err.msg,Q5(J,H+F.err.line))}else if(K)if(!U.tagClosed)return d("InvalidTag","Closing tag '"+$+"' doesn't have proper closing.",Q5(J,Y));else if(X.trim().length>0)return d("InvalidTag","Closing tag '"+$+"' can't have attributes or invalid starting.",Q5(J,Z));else if(Q.length===0)return d("InvalidTag","Closing tag '"+$+"' has not been opened.",Q5(J,Z));else{let H=Q.pop();if($!==H.tagName){let F=Q5(J,H.tagStartPos);return d("InvalidTag","Expected closing tag '"+H.tagName+"' (opened in line "+F.line+", col "+F.col+") instead of closing tag '"+$+"'.",Q5(J,Z))}if(Q.length==0)z=!0}else{let H=iJ(X,W);if(H!==!0)return d(H.err.code,H.err.msg,Q5(J,Y-X.length+H.err.line));if(z===!0)return d("InvalidXml","Multiple possible root nodes found.",Q5(J,Y));else if(W.unpairedTags.indexOf($)!==-1);else Q.push({tagName:$,tagStartPos:Z});G=!0}for(Y++;Y<J.length;Y++)if(J[Y]==="<")if(J[Y+1]==="!"){Y++,Y=lJ(J,Y);continue}else if(J[Y+1]==="?"){if(Y=dJ(J,++Y),Y.err)return Y}else break;else if(J[Y]==="&"){let H=e1(J,Y);if(H==-1)return d("InvalidChar","char '&' is not expected.",Q5(J,Y));Y=H}else if(z===!0&&!pJ(J[Y]))return d("InvalidXml","Extra text at the end",Q5(J,Y));if(J[Y]==="<")Y--}}else{if(pJ(J[Y]))continue;return d("InvalidChar","char '"+J[Y]+"' is not expected.",Q5(J,Y))}if(!G)return d("InvalidXml","Start tag expected.",1);else if(Q.length==1)return d("InvalidTag","Unclosed tag '"+Q[0].tagName+"'.",Q5(J,Q[0].tagStartPos));else if(Q.length>0)return d("InvalidXml","Invalid '"+JSON.stringify(Q.map((Y)=>Y.tagName),null,4).replace(/\r?\n/g,"")+"' found.",{line:1,col:1});return!0}function pJ(J){return J===" "||J==="\t"||J===`
`||J==="\r"}function dJ(J,W){let Q=W;for(;W<J.length;W++)if(J[W]=="?"||J[W]==" "){let G=J.substr(Q,W-Q);if(W>5&&G==="xml")return d("InvalidXml","XML declaration allowed only at the start of the document.",Q5(J,W));else if(J[W]=="?"&&J[W+1]==">"){W++;break}else continue}return W}function lJ(J,W){if(J.length>W+5&&J[W+1]==="-"&&J[W+2]==="-"){for(W+=3;W<J.length;W++)if(J[W]==="-"&&J[W+1]==="-"&&J[W+2]===">"){W+=2;break}}else if(J.length>W+8&&J[W+1]==="D"&&J[W+2]==="O"&&J[W+3]==="C"&&J[W+4]==="T"&&J[W+5]==="Y"&&J[W+6]==="P"&&J[W+7]==="E"){let Q=1;for(W+=8;W<J.length;W++)if(J[W]==="<")Q++;else if(J[W]===">"){if(Q--,Q===0)break}}else if(J.length>W+9&&J[W+1]==="["&&J[W+2]==="C"&&J[W+3]==="D"&&J[W+4]==="A"&&J[W+5]==="T"&&J[W+6]==="A"&&J[W+7]==="["){for(W+=8;W<J.length;W++)if(J[W]==="]"&&J[W+1]==="]"&&J[W+2]===">"){W+=2;break}}return W}var r1='"',o1="'";function a1(J,W){let Q="",G="",z=!1;for(;W<J.length;W++){if(J[W]===r1||J[W]===o1)if(G==="")G=J[W];else if(G!==J[W]);else G="";else if(J[W]===">"){if(G===""){z=!0;break}}Q+=J[W]}if(G!=="")return!1;return{value:Q,index:W,tagClosed:z}}var s1=new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`,"g");function iJ(J,W){let Q=B8(J,s1),G={};for(let z=0;z<Q.length;z++){if(Q[z][1].length===0)return d("InvalidAttr","Attribute '"+Q[z][2]+"' has no space in starting.",_6(Q[z]));else if(Q[z][3]!==void 0&&Q[z][4]===void 0)return d("InvalidAttr","Attribute '"+Q[z][2]+"' is without value.",_6(Q[z]));else if(Q[z][3]===void 0&&!W.allowBooleanAttributes)return d("InvalidAttr","boolean attribute '"+Q[z][2]+"' is not allowed.",_6(Q[z]));let Y=Q[z][2];if(!JQ(Y))return d("InvalidAttr","Attribute '"+Y+"' is an invalid name.",_6(Q[z]));if(!Object.prototype.hasOwnProperty.call(G,Y))G[Y]=1;else return d("InvalidAttr","Attribute '"+Y+"' is repeated.",_6(Q[z]))}return!0}function t1(J,W){let Q=/\d/;if(J[W]==="x")W++,Q=/[\da-fA-F]/;for(;W<J.length;W++){if(J[W]===";")return W;if(!J[W].match(Q))break}return-1}function e1(J,W){if(W++,J[W]===";")return-1;if(J[W]==="#")return W++,t1(J,W);let Q=0;for(;W<J.length;W++,Q++){if(J[W].match(/\w/)&&Q<20)continue;if(J[W]===";")break;return-1}return W}function d(J,W,Q){return{err:{code:J,msg:W,line:Q.line||Q,col:Q.col}}}function JQ(J){return Z0(J)}function QQ(J){return Z0(J)}function Q5(J,W){let Q=J.substring(0,W).split(/\r?\n/);return{line:Q.length,col:Q[Q.length-1].length+1}}function _6(J){return J.startIndex+J[1].length}var K0={cent:"\xA2",pound:"\xA3",curren:"\xA4",yen:"\xA5",euro:"\u20AC",dollar:"$",fnof:"\u0192",inr:"\u20B9",af:"\u060B",birr:"\u1265\u122D",peso:"\u20B1",rub:"\u20BD",won:"\u20A9",yuan:"\xA5",cedil:"\xB8"};var x6={amp:"&",apos:"'",gt:">",lt:"<",quot:'"'},X0={nbsp:"\xA0",copy:"\xA9",reg:"\xAE",trade:"\u2122",mdash:"\u2014",ndash:"\u2013",hellip:"\u2026",laquo:"\xAB",raquo:"\xBB",lsquo:"\u2018",rsquo:"\u2019",ldquo:"\u201C",rdquo:"\u201D",bull:"\u2022",para:"\xB6",sect:"\xA7",deg:"\xB0",frac12:"\xBD",frac14:"\xBC",frac34:"\xBE"};var q6=Object.freeze({ALLOW:"allow",BLOCK:"block",THROW:"throw"}),WQ=new Set("!?\\\\/[]$%{}^&*()<>|+");function nJ(J){if(J[0]==="#")throw Error(`[EntityReplacer] Invalid character '#' in entity name: "${J}"`);for(let W of J)if(WQ.has(W))throw Error(`[EntityReplacer] Invalid character '${W}' in entity name: "${J}"`);return J}function h6(...J){let W=Object.create(null);for(let Q of J){if(!Q)continue;for(let G of Object.keys(Q)){let z=Q[G];if(typeof z==="string")W[G]=z;else if(z&&typeof z==="object"&&z.val!==void 0){let Y=z.val;if(typeof Y==="string")W[G]=Y}}}return W}var o5="external",P8="base",F0="all";function YQ(J){if(!J||J===o5)return new Set([o5]);if(J===F0)return new Set([F0]);if(J===P8)return new Set([P8]);if(Array.isArray(J))return new Set(J);return new Set([o5])}var Y5=Object.freeze({allow:0,leave:1,remove:2,throw:3}),GQ=new Set([9,10,13]);function zQ(J){if(!J)return{xmlVersion:1,onLevel:Y5.allow,nullLevel:Y5.remove};let W=J.xmlVersion===1.1?1.1:1,Q=Y5[J.onNCR]??Y5.allow,G=Y5[J.nullNCR]??Y5.remove,z=Math.max(G,Y5.remove);return{xmlVersion:W,onLevel:Q,nullLevel:z}}class u6{constructor(J={}){this._limit=J.limit||{},this._maxTotalExpansions=this._limit.maxTotalExpansions||0,this._maxExpandedLength=this._limit.maxExpandedLength||0,this._postCheck=typeof J.postCheck==="function"?J.postCheck:(Q)=>Q,this._limitTiers=YQ(this._limit.applyLimitsTo??o5),this._numericAllowed=J.numericAllowed??!0,this._baseMap=h6(x6,J.namedEntities||null),this._externalMap=Object.create(null),this._inputMap=Object.create(null),this._totalExpansions=0,this._expandedLength=0,this._removeSet=new Set(J.remove&&Array.isArray(J.remove)?J.remove:[]),this._leaveSet=new Set(J.leave&&Array.isArray(J.leave)?J.leave:[]);let W=zQ(J.ncr);this._ncrXmlVersion=W.xmlVersion,this._ncrOnLevel=W.onLevel,this._ncrNullLevel=W.nullLevel,this._onExternalEntity=typeof J.onExternalEntity==="function"?J.onExternalEntity:null,this._onInputEntity=typeof J.onInputEntity==="function"?J.onInputEntity:null}_applyRegistrationHook(J,W,Q,G){if(!J)return!0;let z=J(W,Q);if(z===q6.BLOCK)return!1;if(z===q6.THROW)throw Error(`[EntityDecoder] Registration of ${G} entity "&${W};" was rejected by hook`);return!0}setExternalEntities(J){if(J)for(let G of Object.keys(J))nJ(G);if(!this._onExternalEntity){this._externalMap=h6(J);return}let W=h6(J),Q=Object.create(null);for(let[G,z]of Object.entries(W))if(this._applyRegistrationHook(this._onExternalEntity,G,z,"external"))Q[G]=z;this._externalMap=Q}addExternalEntity(J,W){if(nJ(J),typeof W==="string"&&W.indexOf("&")===-1){if(this._applyRegistrationHook(this._onExternalEntity,J,W,"external"))this._externalMap[J]=W}}addInputEntities(J){if(this._totalExpansions=0,this._expandedLength=0,!this._onInputEntity){this._inputMap=h6(J);return}let W=h6(J),Q=Object.create(null);for(let[G,z]of Object.entries(W))if(this._applyRegistrationHook(this._onInputEntity,G,z,"input"))Q[G]=z;this._inputMap=Q}reset(){return this._inputMap=Object.create(null),this._totalExpansions=0,this._expandedLength=0,this}setXmlVersion(J){this._ncrXmlVersion=J===1.1?1.1:1}decode(J){if(typeof J!=="string"||J.length===0)return J;if(J.indexOf("&")===-1)return J;let W=J,Q=[],G=J.length,z=0,Y=0,Z=this._maxTotalExpansions>0,K=this._maxExpandedLength>0,$=Z||K;while(Y<G){if(J.charCodeAt(Y)!==38){Y++;continue}let X=Y+1;while(X<G&&J.charCodeAt(X)!==59&&X-Y<=32)X++;if(X>=G||J.charCodeAt(X)!==59){Y++;continue}let H=J.slice(Y+1,X);if(H.length===0){Y++;continue}let F,q;if(this._removeSet.has(H)){if(F="",q===void 0)q=o5}else if(this._leaveSet.has(H)){Y++;continue}else if(H.charCodeAt(0)===35){let L=this._resolveNCR(H);if(L===void 0){Y++;continue}F=L,q=P8}else{let L=this._resolveName(H);F=L?.value,q=L?.tier}if(F===void 0){Y++;continue}if(Y>z)Q.push(J.slice(z,Y));if(Q.push(F),z=X+1,Y=z,$&&this._tierCounts(q)){if(Z){if(this._totalExpansions++,this._totalExpansions>this._maxTotalExpansions)throw Error(`[EntityReplacer] Entity expansion count limit exceeded: ${this._totalExpansions} > ${this._maxTotalExpansions}`)}if(K){let L=F.length-(H.length+2);if(L>0){if(this._expandedLength+=L,this._expandedLength>this._maxExpandedLength)throw Error(`[EntityReplacer] Expanded content length limit exceeded: ${this._expandedLength} > ${this._maxExpandedLength}`)}}}}if(z<G)Q.push(J.slice(z));let U=Q.length===0?J:Q.join("");return this._postCheck(U,W)}_tierCounts(J){if(this._limitTiers.has(F0))return!0;return this._limitTiers.has(J)}_resolveName(J){if(J in this._inputMap)return{value:this._inputMap[J],tier:o5};if(J in this._externalMap)return{value:this._externalMap[J],tier:o5};if(J in this._baseMap)return{value:this._baseMap[J],tier:P8};return}_classifyNCR(J){if(J===0)return this._ncrNullLevel;if(J>=55296&&J<=57343)return Y5.remove;if(this._ncrXmlVersion===1){if(J>=1&&J<=31&&!GQ.has(J))return Y5.remove}return-1}_applyNCRAction(J,W,Q){switch(J){case Y5.allow:return String.fromCodePoint(Q);case Y5.remove:return"";case Y5.leave:return;case Y5.throw:throw Error(`[EntityDecoder] Prohibited numeric character reference &${W}; (U+${Q.toString(16).toUpperCase().padStart(4,"0")})`);default:return String.fromCodePoint(Q)}}_resolveNCR(J){let W=J.charCodeAt(1),Q;if(W===120||W===88)Q=parseInt(J.slice(2),16);else Q=parseInt(J.slice(1),10);if(Number.isNaN(Q)||Q<0||Q>1114111)return;let G=this._classifyNCR(Q);if(!this._numericAllowed&&G<Y5.remove)return;let z=G===-1?this._ncrOnLevel:Math.max(this._ncrOnLevel,G);return this._applyNCRAction(z,J,Q)}}var rJ=(J)=>{if(v6.includes(J))return"__"+J;return J},UQ={preserveOrder:!1,attributeNamePrefix:"@_",attributesGroupName:!1,textNodeName:"#text",ignoreAttributes:!0,removeNSPrefix:!1,allowBooleanAttributes:!1,parseTagValue:!0,parseAttributeValue:!1,trimValues:!0,cdataPropName:!1,numberParseOptions:{hex:!0,leadingZeros:!0,eNotation:!0,unicode:!1},tagValueProcessor:function(J,W){return W},attributeValueProcessor:function(J,W){return W},stopNodes:[],alwaysCreateTextNode:!1,isArray:()=>!1,commentPropName:!1,unpairedTags:[],processEntities:!0,htmlEntities:!1,entityDecoder:null,ignoreDeclaration:!1,ignorePiTags:!1,transformTagName:!1,transformAttributeName:!1,updateTag:function(J,W,Q){return J},captureMetaData:!1,maxNestedTags:100,strictReservedNames:!0,jPath:!0,onDangerousProperty:rJ};function ZQ(J,W){if(typeof J!=="string")return;let Q=J.toLowerCase();if(v6.some((G)=>Q===G.toLowerCase()))throw Error(`[SECURITY] Invalid ${W}: "${J}" is a reserved JavaScript keyword that could cause prototype pollution`);if(j8.some((G)=>Q===G.toLowerCase()))throw Error(`[SECURITY] Invalid ${W}: "${J}" is a reserved JavaScript keyword that could cause prototype pollution`)}function oJ(J,W){if(typeof J==="boolean")return{enabled:J,maxEntitySize:1e4,maxExpansionDepth:1e4,maxTotalExpansions:1/0,maxExpandedLength:1e5,maxEntityCount:1000,allowedTags:null,tagFilter:null,appliesTo:"all"};if(typeof J==="object"&&J!==null)return{enabled:J.enabled!==!1,maxEntitySize:Math.max(1,J.maxEntitySize??1e4),maxExpansionDepth:Math.max(1,J.maxExpansionDepth??1e4),maxTotalExpansions:Math.max(1,J.maxTotalExpansions??1/0),maxExpandedLength:Math.max(1,J.maxExpandedLength??1e5),maxEntityCount:Math.max(1,J.maxEntityCount??1000),allowedTags:J.allowedTags??null,tagFilter:J.tagFilter??null,appliesTo:J.appliesTo??"all"};return oJ(!0)}var aJ=function(J){let W=Object.assign({},UQ,J),Q=[{value:W.attributeNamePrefix,name:"attributeNamePrefix"},{value:W.attributesGroupName,name:"attributesGroupName"},{value:W.textNodeName,name:"textNodeName"},{value:W.cdataPropName,name:"cdataPropName"},{value:W.commentPropName,name:"commentPropName"}];for(let{value:G,name:z}of Q)if(G)ZQ(G,z);if(W.onDangerousProperty===null)W.onDangerousProperty=rJ;if(W.processEntities=oJ(W.processEntities,W.htmlEntities),W.unpairedTagsSet=new Set(W.unpairedTags),W.stopNodes&&Array.isArray(W.stopNodes))W.stopNodes=W.stopNodes.map((G)=>{if(typeof G==="string"&&G.startsWith("*."))return"."+"."+G.substring(2);return G});return W};var O8;if(typeof Symbol!=="function")O8="@@xmlMetadata";else O8=Symbol("XML Node Metadata");class F5{constructor(J){this.tagname=J,this.child=[],this[":@"]=Object.create(null)}add(J,W){if(J==="__proto__")J="#__proto__";this.child.push({[J]:W})}addChild(J,W){if(J.tagname==="__proto__")J.tagname="#__proto__";if(J[":@"]&&Object.keys(J[":@"]).length>0)this.child.push({[J.tagname]:J.child,[":@"]:J[":@"]});else this.child.push({[J.tagname]:J.child});if(W!==void 0)this.child[this.child.length-1][O8]={startIndex:W}}static getMetaDataSymbol(){return O8}}var tJ=":A-Za-z_"+"\xC0-\xD6\xD8-\xF6\xF8-\u02FF"+"\u0370-\u037D"+"\u037F-\u0486\u0488-\u1FFF"+"\u200C-\u200D"+"\u2070-\u218F"+"\u2C00-\u2FEF"+"\u3001-\uD7FF"+"\uF900-\uFDCF"+"\uFDF0-\uFFFD",KQ=tJ+"\\-\\.\\d"+"\xB7"+"\u0300-\u036F"+"\u203F-\u2040",eJ=":A-Za-z_"+"\xC0-\u02FF"+"\u0370-\u037D"+"\u037F-\u0486\u0488-\u1FFF"+"\u200C-\u200D"+"\u2070-\u218F"+"\u2C00-\u2FEF"+"\u3001-\uD7FF"+"\uF900-\uFDCF"+"\uFDF0-\uFFFD"+"\uD800\uDC00-\uDB7F\uDFFF",XQ=eJ+"\\-\\.\\d"+"\xB7"+"\u0300-\u036F"+"\u0487"+"\u203F-\u2040",H0=(J,W,Q="")=>{let G=J.replace(":",""),z=W.replace(":",""),Y=`[${G}][${z}]*`;return{name:new RegExp(`^[${J}][${W}]*$`,Q),ncName:new RegExp(`^${Y}$`,Q),qName:new RegExp(`^${Y}(?::${Y})?$`,Q),nmToken:new RegExp(`^[${W}]+$`,Q),nmTokens:new RegExp(`^[${W}]+(?:\\s+[${W}]+)*$`,Q)}},FQ=H0(tJ,KQ),HQ=H0(eJ,XQ,"u");var $Q=":A-Za-z_\\-\\.\\d",qQ=H0(":A-Za-z_",$Q),J7=(J="1.0",W=!1)=>{if(W)return qQ;return J==="1.1"?HQ:FQ};var $0=(J,{xmlVersion:W="1.0",asciiOnly:Q=!1}={})=>J7(W,Q).qName.test(J);var sJ=["name","ncName","qName","nmToken","nmTokens"],C8=(J,{xmlVersion:W="1.0",asciiOnly:Q=!1,maxCacheSize:G=2048}={})=>{if(!sJ.includes(J))throw TypeError(`Unknown production "${J}". Must be one of: ${sJ.join(", ")}`);let z=J7(W,Q)[J],Y=new Map,Z=(K)=>{let $=Y.get(K);if($!==void 0)return $;let U=z.test(K);if(Y.size<G)Y.set(K,U);return U};return Z.reset=()=>{Y=new Map},Z};class A8{constructor(J,W){this.suppressValidationErr=!J,this.options=J,this.xmlVersion=W||1}setXmlVersion(J=1){this.xmlVersion=J}readDocType(J,W){let Q=Object.create(null),G=0;if(J[W+3]==="O"&&J[W+4]==="C"&&J[W+5]==="T"&&J[W+6]==="Y"&&J[W+7]==="P"&&J[W+8]==="E"){W=W+9;let z=1,Y=!1,Z=!1,K="";for(;W<J.length;W++)if(J[W]==="<"&&!Z){if(Y&&a5(J,"!ENTITY",W)){W+=7;let $,U;if([$,U,W]=this.readEntityExp(J,W+1,this.suppressValidationErr),U.indexOf("&")===-1){if(this.options.enabled!==!1&&this.options.maxEntityCount!=null&&G>=this.options.maxEntityCount)throw Error(`Entity count (${G+1}) exceeds maximum allowed (${this.options.maxEntityCount})`);Q[$]=U,G++}}else if(Y&&a5(J,"!ELEMENT",W)){W+=8;let{index:$}=this.readElementExp(J,W+1);W=$}else if(Y&&a5(J,"!ATTLIST",W))W+=8;else if(Y&&a5(J,"!NOTATION",W)){W+=9;let{index:$}=this.readNotationExp(J,W+1,this.suppressValidationErr);W=$}else if(a5(J,"!--",W))Z=!0;else throw Error("Invalid DOCTYPE");z++,K=""}else if(J[W]===">"){if(Z){if(J[W-1]==="-"&&J[W-2]==="-")Z=!1,z--}else z--;if(z===0)break}else if(J[W]==="[")Y=!0;else K+=J[W];if(z!==0)throw Error("Unclosed DOCTYPE")}else throw Error("Invalid Tag instead of DOCTYPE");return{entities:Q,i:W}}readEntityExp(J,W){W=G5(J,W);let Q=W;while(W<J.length&&!/\s/.test(J[W])&&J[W]!=='"'&&J[W]!=="'")W++;let G=J.substring(Q,W);if(g6(G,{xmlVersion:this.xmlVersion}),W=G5(J,W),!this.suppressValidationErr){if(J.substring(W,W+6).toUpperCase()==="SYSTEM")throw Error("External entities are not supported");else if(J[W]==="%")throw Error("Parameter entities are not supported")}let z="";if([W,z]=this.readIdentifierVal(J,W,"entity"),this.options.enabled!==!1&&this.options.maxEntitySize!=null&&z.length>this.options.maxEntitySize)throw Error(`Entity "${G}" size (${z.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`);return W--,[G,z,W]}readNotationExp(J,W){W=G5(J,W);let Q=W;while(W<J.length&&!/\s/.test(J[W]))W++;let G=J.substring(Q,W);!this.suppressValidationErr&&g6(G,{xmlVersion:this.xmlVersion}),W=G5(J,W);let z=J.substring(W,W+6).toUpperCase();if(!this.suppressValidationErr&&z!=="SYSTEM"&&z!=="PUBLIC")throw Error(`Expected SYSTEM or PUBLIC, found "${z}"`);W+=z.length,W=G5(J,W);let Y=null,Z=null;if(z==="PUBLIC"){if([W,Y]=this.readIdentifierVal(J,W,"publicIdentifier"),W=G5(J,W),J[W]==='"'||J[W]==="'")[W,Z]=this.readIdentifierVal(J,W,"systemIdentifier")}else if(z==="SYSTEM"){if([W,Z]=this.readIdentifierVal(J,W,"systemIdentifier"),!this.suppressValidationErr&&!Z)throw Error("Missing mandatory system identifier for SYSTEM notation")}return{notationName:G,publicIdentifier:Y,systemIdentifier:Z,index:--W}}readIdentifierVal(J,W,Q){let G="",z=J[W];if(z!=='"'&&z!=="'")throw Error(`Expected quoted string, found "${z}"`);W++;let Y=W;while(W<J.length&&J[W]!==z)W++;if(G=J.substring(Y,W),J[W]!==z)throw Error(`Unterminated ${Q} value`);return W++,[W,G]}readElementExp(J,W){W=G5(J,W);let Q=W;while(W<J.length&&!/\s/.test(J[W]))W++;let G=J.substring(Q,W);if(!this.suppressValidationErr&&!$0(G,{xmlVersion:this.xmlVersion}))throw Error(`Invalid element name: "${G}"`);W=G5(J,W);let z="";if(J[W]==="E"&&a5(J,"MPTY",W))W+=4;else if(J[W]==="A"&&a5(J,"NY",W))W+=2;else if(J[W]==="("){W++;let Y=W;while(W<J.length&&J[W]!==")")W++;if(z=J.substring(Y,W),J[W]!==")")throw Error("Unterminated content model")}else if(!this.suppressValidationErr)throw Error(`Invalid Element Expression, found "${J[W]}"`);return{elementName:G,contentModel:z.trim(),index:W}}readAttlistExp(J,W){W=G5(J,W);let Q=W;while(W<J.length&&!/\s/.test(J[W]))W++;let G=J.substring(Q,W);g6(G,{xmlVersion:this.xmlVersion}),W=G5(J,W),Q=W;while(W<J.length&&!/\s/.test(J[W]))W++;let z=J.substring(Q,W);if(!g6(z,{xmlVersion:this.xmlVersion}))throw Error(`Invalid attribute name: "${z}"`);W=G5(J,W);let Y="";if(J.substring(W,W+8).toUpperCase()==="NOTATION"){if(Y="NOTATION",W+=8,W=G5(J,W),J[W]!=="(")throw Error(`Expected '(', found "${J[W]}"`);W++;let K=[];while(W<J.length&&J[W]!==")"){let $=W;while(W<J.length&&J[W]!=="|"&&J[W]!==")")W++;let U=J.substring($,W);if(U=U.trim(),!g6(U,{xmlVersion:this.xmlVersion}))throw Error(`Invalid notation name: "${U}"`);if(K.push(U),J[W]==="|")W++,W=G5(J,W)}if(J[W]!==")")throw Error("Unterminated list of notations");W++,Y+=" ("+K.join("|")+")"}else{let K=W;while(W<J.length&&!/\s/.test(J[W]))W++;Y+=J.substring(K,W);let $=["CDATA","ID","IDREF","IDREFS","ENTITY","ENTITIES","NMTOKEN","NMTOKENS"];if(!this.suppressValidationErr&&!$.includes(Y.toUpperCase()))throw Error(`Invalid attribute type: "${Y}"`)}W=G5(J,W);let Z="";if(J.substring(W,W+8).toUpperCase()==="#REQUIRED")Z="#REQUIRED",W+=8;else if(J.substring(W,W+7).toUpperCase()==="#IMPLIED")Z="#IMPLIED",W+=7;else[W,Z]=this.readIdentifierVal(J,W,"ATTLIST");return{elementName:G,attributeName:z,attributeType:Y,defaultValue:Z,index:W}}}var G5=(J,W)=>{while(W<J.length&&/\s/.test(J[W]))W++;return W};function a5(J,W,Q){for(let G=0;G<W.length;G++)if(W[G]!==J[Q+G+1])return!1;return!0}function g6(J,W){if($0(J,{xmlVersion:W}))return J;else throw Error(`Invalid entity name ${J}`)}var VQ=[48,1632,1776,2406,2534,2662,2790,2918,3046,3174,3302,3430,3558,3664,3792,3872,4160,4240,6112,6160,6470,6608,6784,6800,6992,7088,7232,7248,65296,120782,120792,120802,120812,120822,66720,68912,69734,69872,69942,70096,70384,70736,70864,71248,71360,71472,71904,72016,72688,72784,73040,73120,73552,92768,92864,93008,123200,123632,124144,125264,130032],q0=255,R8=new Map;var c6=1632;var T8=new Uint8Array(63904).fill(255);for(let J of VQ)for(let W=0;W<10;W++){let Q=J+W;if(Q<=65535)T8[Q-1632]=W;else R8.set(Q,W)}var Q7=48,W7=57,Y7=45,E8=new Set([8722,65293,65123]);function LQ(J){if(typeof J!=="string")return J;let W=J.length;if(W===0)return J;let Q=-1;for(let z=0;z<W;z++){let Y=J.charCodeAt(z);if(Y>=Q7&&Y<=W7||Y===Y7)continue;if(Y<c6){if(E8.has(Y)){Q=z;break}continue}if(Y>=55296&&Y<=56319){if(z+1<W){let Z=J.charCodeAt(z+1);if(Z>=56320&&Z<=57343){let K=65536+(Y-55296<<10)+(Z-56320);if(R8.has(K)){Q=z;break}}}continue}if(T8[Y-c6]!==q0||E8.has(Y)){Q=z;break}}if(Q===-1)return J;let G=[];if(Q>0)G.push(J.slice(0,Q));for(let z=Q;z<W;z++){let Y=J.charCodeAt(z);if(Y>=Q7&&Y<=W7||Y===Y7){G.push(J[z]);continue}if(Y<c6){G.push(E8.has(Y)?"-":J[z]);continue}if(Y>=55296&&Y<=56319){if(z+1<W){let K=J.charCodeAt(z+1);if(K>=56320&&K<=57343){let $=65536+(Y-55296<<10)+(K-56320),U=R8.get($);if(U!==void 0){G.push(String.fromCharCode(U+48)),z++;continue}}}G.push(J[z]);continue}if(E8.has(Y)){G.push("-");continue}let Z=T8[Y-c6];G.push(Z!==q0?String.fromCharCode(Z+48):J[z])}return G.join("")}var G7=LQ;var BQ=/^[-+]?0x[a-fA-F0-9]+$/,jQ=/^0b[01]+$/,MQ=/^0o[0-7]+$/,PQ=/^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/,OQ={hex:!0,binary:!1,octal:!1,leadingZeros:!0,decimalPoint:".",eNotation:!0,infinity:"original",unicode:!1};function L0(J,W={}){if(W=Object.assign({},OQ,W),!J||typeof J!=="string")return J;let Q=J.trim();if(Q.length===0)return J;else if(W.skipLike!==void 0&&W.skipLike.test(Q))return J;else if(Q==="0")return 0;if(W.unicode){if(Q=G7(Q),Q==="0")return 0}if(W.hex&&BQ.test(Q))return V0(Q,16);else if(W.binary&&jQ.test(Q))return V0(Q,2);else if(W.octal&&MQ.test(Q))return V0(Q,8);else if(!isFinite(Q))return TQ(J,Number(Q),W);else if(Q.includes("e")||Q.includes("E"))return AQ(J,Q,W);else{let G=PQ.exec(Q);if(G){let z=G[1]||"",Y=G[2],Z=RQ(G[3]),K=z?J[Y.length+1]===".":J[Y.length]===".";if(!W.leadingZeros&&(Y.length>1||Y.length===1&&!K))return J;else{let $=Number(Q),U=String($);if($===0)return $;if(U.search(/[eE]/)!==-1)if(W.eNotation)return $;else return J;else if(Q.indexOf(".")!==-1)if(U==="0")return $;else if(U===Z)return $;else if(U===`${z}${Z}`)return $;else return J;let X=Y?Z:Q;if(Y)return X===U||z+X===U?$:J;else return X===U||X===z+U?$:J}}else return J}}var CQ=/^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;function AQ(J,W,Q){if(!Q.eNotation)return J;let G=W.match(CQ);if(G){let z=G[1]||"",Y=G[3].indexOf("e")===-1?"E":"e",Z=G[2],K=z?J[Z.length+1]===Y:J[Z.length]===Y;if(Z.length>1&&K)return J;else if(Z.length===1&&(G[3].startsWith(`.${Y}`)||G[3][0]===Y))return Number(W);else if(Z.length>0)if(Q.leadingZeros&&!K)return W=(G[1]||"")+G[3],Number(W);else return J;else return Number(W)}else return J}function RQ(J){if(J&&J.indexOf(".")!==-1){if(J=J.replace(/0+$/,""),J===".")J="0";else if(J[0]===".")J="0"+J;else if(J[J.length-1]===".")J=J.substring(0,J.length-1);return J}return J}function V0(J,W){let Q=J.trim();if(W===2||W===8)J=Q.substring(2);if(parseInt)return parseInt(J,W);else if(Number.parseInt)return Number.parseInt(J,W);else if(window&&window.parseInt)return window.parseInt(J,W);else throw Error("parseInt, Number.parseInt, window.parseInt are not supported")}function TQ(J,W,Q){let G=W===1/0;switch(Q.infinity.toLowerCase()){case"null":return null;case"infinity":return W;case"string":return G?"Infinity":"-Infinity";case"original":default:return J}}function B0(J){if(typeof J==="function")return J;if(Array.isArray(J))return(W)=>{for(let Q of J){if(typeof Q==="string"&&W===Q)return!0;if(Q instanceof RegExp&&Q.test(W))return!0}};return()=>!1}class B5{constructor(J,W={},Q){this.pattern=J,this.separator=W.separator||".",this.segments=this._parse(J),this.data=Q,this._hasDeepWildcard=this.segments.some((G)=>G.type==="deep-wildcard"),this._hasAttributeCondition=this.segments.some((G)=>G.attrName!==void 0),this._hasPositionSelector=this.segments.some((G)=>G.position!==void 0)}_parse(J){let W=[],Q=0,G="";while(Q<J.length)if(J[Q]===this.separator)if(Q+1<J.length&&J[Q+1]===this.separator){if(G.trim())W.push(this._parseSegment(G.trim())),G="";W.push({type:"deep-wildcard"}),Q+=2}else{if(G.trim())W.push(this._parseSegment(G.trim()));G="",Q++}else G+=J[Q],Q++;if(G.trim())W.push(this._parseSegment(G.trim()));return W}_parseSegment(J){let W={type:"tag"},Q=null,G=J,z=J.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);if(z){if(G=z[1]+z[3],z[2]){let U=z[2].slice(1,-1);if(U)Q=U}}let Y=void 0,Z=G;if(G.includes("::")){let U=G.indexOf("::");if(Y=G.substring(0,U).trim(),Z=G.substring(U+2).trim(),!Y)throw Error(`Invalid namespace in pattern: ${J}`)}let K=void 0,$=null;if(Z.includes(":")){let U=Z.lastIndexOf(":"),X=Z.substring(0,U).trim(),H=Z.substring(U+1).trim();if(["first","last","odd","even"].includes(H)||/^nth\(\d+\)$/.test(H))K=X,$=H;else K=Z}else K=Z;if(!K)throw Error(`Invalid segment pattern: ${J}`);if(W.tag=K,Y)W.namespace=Y;if(Q)if(Q.includes("=")){let U=Q.indexOf("=");W.attrName=Q.substring(0,U).trim(),W.attrValue=Q.substring(U+1).trim()}else W.attrName=Q.trim();if($){let U=$.match(/^nth\((\d+)\)$/);if(U)W.position="nth",W.positionValue=parseInt(U[1],10);else W.position=$}return W}get length(){return this.segments.length}hasDeepWildcard(){return this._hasDeepWildcard}hasAttributeCondition(){return this._hasAttributeCondition}hasPositionSelector(){return this._hasPositionSelector}toString(){return this.pattern}}class m6{constructor(){this._byDepthAndTag=new Map,this._wildcardByDepth=new Map,this._deepWildcards=[],this._deepByTerminalTag=new Map,this._patterns=new Set,this._sealed=!1}add(J){if(this._sealed)throw TypeError("ExpressionSet is sealed. Create a new ExpressionSet to add more expressions.");if(this._patterns.has(J.pattern))return this;if(this._patterns.add(J.pattern),J.hasDeepWildcard()){let z=J.segments[J.segments.length-1];if(z&&z.type!=="deep-wildcard"&&z.tag!=="*"){let Y=z.tag;if(!this._deepByTerminalTag.has(Y))this._deepByTerminalTag.set(Y,[]);this._deepByTerminalTag.get(Y).push(J)}else this._deepWildcards.push(J);return this}let W=J.length,G=J.segments[J.segments.length-1]?.tag;if(!G||G==="*"){if(!this._wildcardByDepth.has(W))this._wildcardByDepth.set(W,[]);this._wildcardByDepth.get(W).push(J)}else{let z=`${W}:${G}`;if(!this._byDepthAndTag.has(z))this._byDepthAndTag.set(z,[]);this._byDepthAndTag.get(z).push(J)}return this}addAll(J){for(let W of J)this.add(W);return this}has(J){return this._patterns.has(J.pattern)}get size(){return this._patterns.size}seal(){return this._sealed=!0,this}get isSealed(){return this._sealed}matchesAny(J){return this.findMatch(J)!==null}findMatch(J){let W=J.getDepth(),Q=J.getCurrentTag(),G=`${W}:${Q}`,z=this._byDepthAndTag.get(G);if(z){for(let K=0;K<z.length;K++)if(J.matches(z[K]))return z[K]}let Y=this._wildcardByDepth.get(W);if(Y){for(let K=0;K<Y.length;K++)if(J.matches(Y[K]))return Y[K]}let Z=this._deepByTerminalTag.get(Q);if(Z){for(let K=0;K<Z.length;K++)if(J.matches(Z[K]))return Z[K]}for(let K=0;K<this._deepWildcards.length;K++)if(J.matches(this._deepWildcards[K]))return this._deepWildcards[K];return null}}class z7{constructor(J){this._matcher=J}get separator(){return this._matcher.separator}getCurrentTag(){let J=this._matcher.path;return J.length>0?J[J.length-1].tag:void 0}getCurrentNamespace(){let J=this._matcher.path;return J.length>0?J[J.length-1].namespace:void 0}getAttrValue(J){let W=this._matcher.path;if(W.length===0)return;return W[W.length-1].values?.[J]}hasAttr(J){let W=this._matcher.path;if(W.length===0)return!1;let Q=W[W.length-1];return Q.values!==void 0&&J in Q.values}getAnyParentAttr(J){return this._matcher.getAnyParentAttr(J)}hasAnyParentAttr(J){return this._matcher.hasAnyParentAttr(J)}getPosition(){let J=this._matcher.path;if(J.length===0)return-1;return J[J.length-1].position??0}getCounter(){let J=this._matcher.path;if(J.length===0)return-1;return J[J.length-1].counter??0}getIndex(){return this.getPosition()}getDepth(){return this._matcher.path.length}toString(J,W=!0){return this._matcher.toString(J,W)}toArray(){return this._matcher.path.map((J)=>J.tag)}matches(J){return this._matcher.matches(J)}matchesAny(J){return J.matchesAny(this._matcher)}}class y5{constructor(J={}){this.separator=J.separator||".",this.path=[],this.siblingStacks=[],this._pathStringCache=null,this._view=new z7(this),this._keptAttrs=[]}push(J,W=null,Q=null,G=null){if(this._pathStringCache=null,this.path.length>0)this.path[this.path.length-1].values=void 0;let z=this.path.length,Y=this.siblingStacks[z];if(!Y)Y={counts:new Map,total:0},this.siblingStacks[z]=Y;let Z=Q?`${Q}:${J}`:J,K=Y.counts.get(Z)||0,$=Y.total;Y.counts.set(Z,K+1),Y.total++;let U={tag:J,position:$,counter:K};if(Q!==null&&Q!==void 0)U.namespace=Q;if(W!==null&&W!==void 0)U.values=W;this.path.push(U);let X=this.path.length,H=G!==null?G.keep:null;if(H!==null&&H!==void 0&&H.length>0&&W)for(let F=0;F<H.length;F++){let q=H[F];if(W[q]!==void 0)this._keptAttrs.push({depth:X,name:q,value:W[q]})}}pop(){if(this.path.length===0)return;this._pathStringCache=null;let J=this.path.pop();if(this.siblingStacks.length>this.path.length+1)this.siblingStacks.length=this.path.length+1;let W=this.path.length+1;while(this._keptAttrs.length>0&&this._keptAttrs[this._keptAttrs.length-1].depth>=W)this._keptAttrs.pop();return J}updateCurrent(J){if(this.path.length>0){let W=this.path[this.path.length-1];if(J!==null&&J!==void 0)W.values=J}}getCurrentTag(){return this.path.length>0?this.path[this.path.length-1].tag:void 0}getCurrentNamespace(){return this.path.length>0?this.path[this.path.length-1].namespace:void 0}getAttrValue(J){if(this.path.length===0)return;return this.path[this.path.length-1].values?.[J]}hasAttr(J){if(this.path.length===0)return!1;let W=this.path[this.path.length-1];return W.values!==void 0&&J in W.values}getAnyParentAttr(J){let W=this._keptAttrs;for(let Q=W.length-1;Q>=0;Q--)if(W[Q].name===J)return W[Q].value;return}hasAnyParentAttr(J){let W=this._keptAttrs;for(let Q=W.length-1;Q>=0;Q--)if(W[Q].name===J)return!0;return!1}getPosition(){if(this.path.length===0)return-1;return this.path[this.path.length-1].position??0}getCounter(){if(this.path.length===0)return-1;return this.path[this.path.length-1].counter??0}getIndex(){return this.getPosition()}getDepth(){return this.path.length}toString(J,W=!0){let Q=J||this.separator;if(Q===this.separator&&W===!0){if(this._pathStringCache!==null)return this._pathStringCache;let z=this.path.map((Y)=>Y.namespace?`${Y.namespace}:${Y.tag}`:Y.tag).join(Q);return this._pathStringCache=z,z}return this.path.map((z)=>W&&z.namespace?`${z.namespace}:${z.tag}`:z.tag).join(Q)}toArray(){return this.path.map((J)=>J.tag)}reset(){this._pathStringCache=null,this.path=[],this.siblingStacks=[],this._keptAttrs=[]}matches(J){let W=J.segments;if(W.length===0)return!1;if(J.hasDeepWildcard())return this._matchWithDeepWildcard(W);return this._matchSimple(W)}_matchSimple(J){if(this.path.length!==J.length)return!1;for(let W=0;W<J.length;W++)if(!this._matchSegment(J[W],this.path[W],W===this.path.length-1))return!1;return!0}_matchWithDeepWildcard(J){let W=this.path.length-1,Q=J.length-1;while(Q>=0&&W>=0){let G=J[Q];if(G.type==="deep-wildcard"){if(Q--,Q<0)return!0;let z=J[Q],Y=!1;for(let Z=W;Z>=0;Z--)if(this._matchSegment(z,this.path[Z],Z===this.path.length-1)){W=Z-1,Q--,Y=!0;break}if(!Y)return!1}else{if(!this._matchSegment(G,this.path[W],W===this.path.length-1))return!1;W--,Q--}}return Q<0}_matchSegment(J,W,Q){if(J.tag!=="*"&&J.tag!==W.tag)return!1;if(J.namespace!==void 0){if(J.namespace!=="*"&&J.namespace!==W.namespace)return!1}if(J.attrName!==void 0){if(!Q)return!1;if(!W.values||!(J.attrName in W.values))return!1;if(J.attrValue!==void 0){if(String(W.values[J.attrName])!==String(J.attrValue))return!1}}if(J.position!==void 0){if(!Q)return!1;let G=W.counter??0;if(J.position==="first"&&G!==0)return!1;else if(J.position==="odd"&&G%2!==1)return!1;else if(J.position==="even"&&G%2!==0)return!1;else if(J.position==="nth"&&G!==J.positionValue)return!1}return!0}matchesAny(J){return J.matchesAny(this)}snapshot(){return{path:this.path.map((J)=>({...J})),siblingStacks:this.siblingStacks.map((J)=>J?{counts:new Map(J.counts),total:J.total}:J),keptAttrs:this._keptAttrs.map((J)=>({...J}))}}restore(J){this._pathStringCache=null,this.path=J.path.map((W)=>({...W})),this.siblingStacks=J.siblingStacks.map((W)=>W?{counts:new Map(W.counts),total:W.total}:W),this._keptAttrs=(J.keptAttrs||[]).map((W)=>({...W}))}readOnly(){return this._view}}var EQ=[{id:"html-script-open",description:"<script opening tag",pattern:/<script[\s>/]/i},{id:"html-script-close",description:"</script closing tag",pattern:/<\/script[\s>]/i},{id:"html-javascript-protocol",description:"javascript: URI scheme (with optional whitespace/encoding)",pattern:/j[\t\n\r ]*a[\t\n\r ]*v[\t\n\r ]*a[\t\n\r ]*s[\t\n\r ]*c[\t\n\r ]*r[\t\n\r ]*i[\t\n\r ]*p[\t\n\r ]*t[\t\n\r ]*:/i},{id:"html-vbscript-protocol",description:"vbscript: URI scheme",pattern:/vbscript[\t\n\r ]*:/i},{id:"html-data-html",description:"data:text/html URI \u2014 can execute scripts in browsers",pattern:/data[\t\n\r ]*:[\t\n\r ]*text\/html/i},{id:"html-data-xhtml",description:"data:application/xhtml+xml URI",pattern:/data[\t\n\r ]*:[\t\n\r ]*application\/xhtml/i},{id:"html-data-svg",description:"data:image/svg+xml URI \u2014 can execute scripts",pattern:/data[\t\n\r ]*:[\t\n\r ]*image\/svg\+xml/i},{id:"html-inline-event-handler",description:"Inline event handler attributes: onclick=, onerror=, onload=, etc.",pattern:/\bon\w{1,30}\s*=/i},{id:"html-entity-obfuscated-script",description:"HTML-entity-encoded <script (e.g. &#x3C;script or &lt;script)",pattern:/(?:&#x0*3[Cc];?|&#0*60;?|&lt;)\s*script/i},{id:"html-entity-obfuscated-javascript",description:'HTML-entity-encoded javascript: (partial \u2014 catches common &#106; or &#x6a; for "j")',pattern:/(?:&#x0*6[Aa];?|&#0*106;?)\s*(?:&#x0*61;?|a)[\s\S]{0,80}script\s*:/i},{id:"html-style-expression",description:"CSS expression() \u2014 IE-era code execution in style attributes",pattern:/style[\s\S]{0,20}expression\s*\(/i},{id:"html-object-embed",description:"<object or <embed tags that can load active content",pattern:/<(?:object|embed)[\s>/]/i},{id:"html-base-tag",description:"<base href= \u2014 can hijack all relative URLs on a page",pattern:/<base[\s>]/i},{id:"html-meta-refresh",description:'<meta http-equiv="refresh" \u2014 can redirect users',pattern:/<meta[\s\S]{0,40}http-equiv[\s\S]{0,20}refresh/i},{id:"html-srcdoc",description:"srcdoc= attribute on iframes \u2014 embeds HTML that can run scripts",pattern:/srcdoc\s*=/i},{id:"html-iframe",description:"<iframe tag",pattern:/<iframe[\s>/]/i},{id:"html-form",description:"<form tag \u2014 can be used for phishing / credential harvesting injection",pattern:/<form[\s>/]/i}],V6=EQ;var wQ=[{id:"xml-cdata-injection",description:"CDATA section injection: <![CDATA[ breaks out of text node context",pattern:/<!\[CDATA\[/i},{id:"xml-cdata-close",description:"CDATA close sequence: ]]> can terminate an enclosing CDATA section",pattern:/\]\]>/},{id:"xml-processing-instruction",description:"XML processing instruction: <?xml-stylesheet or <?php etc.",pattern:/<\?(?:xml[\- ]|php|asp)/i},{id:"xml-doctype-injection",description:"DOCTYPE declaration embedded in content \u2014 can define entities",pattern:/<!DOCTYPE(?:[\s[]|$)/i},{id:"xml-entity-system",description:"SYSTEM keyword \u2014 used in external entity declarations (XXE)",pattern:/\bSYSTEM\s+["']/i},{id:"xml-entity-public",description:"PUBLIC keyword \u2014 used in external entity declarations (XXE)",pattern:/\bPUBLIC\s+["']/i},{id:"xml-entity-declaration",description:"<!ENTITY declaration \u2014 defines entities, potential XXE or entity expansion",pattern:/<!ENTITY[\s%]/i},{id:"xml-billion-laughs",description:"Entity reference chaining / billion laughs: repeated &eX; style references",pattern:/(?:&\w{1,20};){3,}/},{id:"xml-namespace-confusion",description:"xmlns: attribute injection \u2014 can redefine namespaces to confuse parsers",pattern:/\bxmlns\s*(?::\w{1,40})?\s*=/i},{id:"xml-comment-injection",description:"<!-- comment injection \u2014 can hide content from some parsers",pattern:/<!--/},{id:"xml-comment-close",description:"--> closes an enclosing XML comment",pattern:/-->/},{id:"xml-pi-close",description:"?> closes an enclosing processing instruction",pattern:/\?>/}],L6=wQ;var NQ=[{id:"svg-script-element",description:"<script element inside SVG executes JavaScript",pattern:/<script[\s>/]/i},{id:"svg-xlink-href-javascript",description:"xlink:href with javascript: \u2014 classic SVG XSS via <a> or <use>",pattern:/xlink\s*:\s*href\s*=\s*["']?\s*javascript\s*:/i},{id:"svg-href-javascript",description:"href= with javascript: in SVG context (<a>, <animate>, etc.)",pattern:/href\s*=\s*["']?\s*javascript\s*:/i},{id:"svg-foreignobject",description:"<foreignObject embeds HTML inside SVG \u2014 can execute scripts",pattern:/<foreignObject[\s>/]/i},{id:"svg-use-external",description:"<use xlink:href or href pointing to external resource (non-fragment URL)",pattern:/<use[\s\S]{0,60}(?:xlink\s*:\s*)?href\s*=\s*(?:["'][^#]|[^"'#\s>])/i},{id:"svg-animate-href",description:'<animate attributeName="href" \u2014 can dynamically change href to javascript:',pattern:/<animate[\s\S]{0,80}attributeName\s*=\s*["'][\s]*href["']/i},{id:"svg-animate-xlinkhref",description:'<animate attributeName="xlink:href"',pattern:/<animate[\s\S]{0,80}attributeName\s*=\s*["'][\s]*xlink\s*:\s*href["']/i},{id:"svg-set-javascript",description:'<set to="javascript:..." \u2014 sets an attribute to a javascript: URI',pattern:/<set[\s\S]{0,80}to\s*=\s*["']?\s*javascript\s*:/i},{id:"svg-event-handler",description:"SVG-specific event handler attributes: onload=, onerror=, onactivate=, etc.",pattern:/\bon(?:load|error|activate|begin|end|repeat|focus|blur|click|mouse\w{1,20}|key\w{1,20})\s*=/i},{id:"svg-handler-generic",description:"Generic on* handler catch-all for SVG attributes",pattern:/\bon\w{1,30}\s*=/i},{id:"svg-filter-feimage",description:"<feImage href= \u2014 filter primitive that can load external resources",pattern:/<feImage[\s\S]{0,80}(?:xlink\s*:\s*)?href\s*=/i},{id:"svg-image-external",description:"<image xlink:href with http/https or javascript protocol",pattern:/<image[\s\S]{0,80}(?:xlink\s*:\s*)?href\s*=\s*["']?\s*(?:https?|javascript)\s*:/i},{id:"svg-style-javascript",description:"style= attribute containing javascript: (e.g. background:url(javascript:...))",pattern:/style\s*=[\s\S]{0,60}javascript\s*:/i}],j0=NQ;var DQ=[{id:"sql-block-comment-open",description:"SQL block comment open: /* ... */ \u2014 unusual in legitimate user text",pattern:/\/\*/},{id:"sql-union-select",description:"UNION SELECT \u2014 most common SQL injection aggregation attack",pattern:/\bUNION\s{1,20}(?:ALL\s{1,20})?SELECT\b/i},{id:"sql-drop-table",description:"DROP TABLE \u2014 destructive DDL injection",pattern:/\bDROP\s{1,20}TABLE\b/i},{id:"sql-drop-database",description:"DROP DATABASE \u2014 destructive DDL injection",pattern:/\bDROP\s{1,20}DATABASE\b/i},{id:"sql-insert-into",description:"INSERT INTO \u2014 data injection",pattern:/\bINSERT\s{1,20}INTO\b/i},{id:"sql-delete-from",description:"DELETE FROM \u2014 data deletion injection",pattern:/\bDELETE\s{1,20}FROM\b/i},{id:"sql-update-set",description:"UPDATE ... SET \u2014 data modification injection",pattern:/\bUPDATE\b[\s\S]{1,60}\bSET\b/i},{id:"sql-exec-xp",description:"EXEC xp_ \u2014 MSSQL extended stored procedure execution",pattern:/\bEXEC(?:UTE)?\s{1,20}xp_/i},{id:"sql-tautology-string",description:`Classic string tautology: ' OR '1'='1 or " OR "1"="1"`,pattern:/'\s{0,10}OR\s{0,10}'[^']{0,20}'\s*=\s*'[^']{0,20}/i},{id:"sql-tautology-numeric",description:"Numeric tautology: OR 1=1",pattern:/\bOR\s{1,10}1\s*=\s*1\b/i},{id:"sql-always-true-zero",description:"Numeric tautology: OR 0=0",pattern:/\bOR\s{1,10}0\s*=\s*0\b/i},{id:"sql-sleep-benchmark",description:"Time-based blind injection: SLEEP() or BENCHMARK()",pattern:/\b(?:SLEEP|BENCHMARK)\s*\(/i},{id:"sql-waitfor-delay",description:"MSSQL time-based blind injection: WAITFOR DELAY",pattern:/\bWAITFOR\s{1,20}DELAY\b/i},{id:"sql-char-function",description:"CHAR() function \u2014 used to obfuscate injected strings",pattern:/\bCHAR\s*\(\s*\d{1,3}/i},{id:"sql-information-schema",description:"INFORMATION_SCHEMA \u2014 reconnaissance query for table/column enumeration",pattern:/\bINFORMATION_SCHEMA\b/i}],p6=DQ;var kQ=[{id:"shell-path-traversal-unix",description:"Unix path traversal: parent slash  \u2014 climbing the directory tree",pattern:/\.\.\//},{id:"shell-path-traversal-windows",description:"Windows path traversal: parent backslash \u2014 climbing the directory tree",pattern:/\.\.\\/},{id:"shell-path-traversal-encoded",description:"URL-encoded path traversal: %2e%2e or %2f variants",pattern:/%2e%2e|%2f\.\.|\.\.%2f/i},{id:"shell-null-byte",description:"Null byte injection: \\x00 or %00 \u2014 truncates strings in C-backed functions",pattern:/\x00|%00/},{id:"shell-semicolon",description:"Semicolon command separator: cmd1; cmd2",pattern:/;/},{id:"shell-pipe",description:"Pipe operator: cmd1 | cmd2",pattern:/\|/},{id:"shell-and-operator",description:"AND operator: cmd1 && cmd2",pattern:/&&/},{id:"shell-or-operator",description:"OR operator: cmd1 || cmd2",pattern:/\|\|/},{id:"shell-backtick",description:"Backtick command substitution: `cmd`",pattern:/`/},{id:"shell-dollar-paren",description:"Dollar-paren command substitution: $(cmd)",pattern:/\$\(/},{id:"shell-dollar-brace",description:"Dollar-brace variable expansion: ${var} \u2014 can be abused for injection",pattern:/\$\{/},{id:"shell-redirect-out",description:"Output redirection: cmd > file or cmd >> file",pattern:/>{1,2}/},{id:"shell-redirect-in",description:"Input redirection: cmd < file",pattern:/</},{id:"shell-newline-injection",description:"Newline injection: \\n or \\r \u2014 can inject new shell commands",pattern:/[\n\r]/},{id:"shell-glob-star",description:"Glob expansion: * or ? \u2014 can expand to unintended files",pattern:/[/\\][*?]/},{id:"shell-absolute-root",description:"Absolute root path injection: string starting with / or \\ (Windows UNC)",pattern:/^(?:\/|\\\\)/},{id:"shell-windows-drive",description:"Windows drive letter path injection: C:\\ or D:/",pattern:/^[a-zA-Z]:[/\\]/},{id:"shell-curl-wget",description:"curl/wget with URL or flags \u2014 can exfiltrate data or download payloads",pattern:/\b(?:curl|wget)\s+(?:https?:\/\/|ftp:\/\/|-)/i}],M0=kQ;var SQ=[{id:"redos-nested-quantifier-plus",description:"Nested + quantifier inside a group with outer quantifier: (a+)+, (.+b)*, etc.",pattern:/\([^)]*\+[^)]*\)[+*]/},{id:"redos-nested-quantifier-star",description:"Nested * quantifier: (a*)* or (a*)+ \u2014 catastrophic backtracking",pattern:/\([^)]*\*[^)]*\)[*+]/},{id:"redos-nested-groups",description:"Doubly nested quantified groups: ((a+)+) \u2014 guaranteed catastrophic",pattern:/\(\([^)]{0,40}\)[+*]\)[+*]/},{id:"redos-alternation-overlap",description:"Overlapping alternation under quantifier: (a|a)+ \u2014 ambiguous NFA paths",pattern:/\(([^|()]{1,20})\|(?:\1)(?:\|[^|()]{1,20}){0,5}\)[+*?]{1,2}/},{id:"redos-star-plus-concat",description:"(x*x)+ pattern \u2014 triggers super-linear backtracking",pattern:/\([^)]{0,10}\*[^)]{0,10}\)[+*]/},{id:"redos-dot-star-greedy",description:"(.*){n,} or (.+){n,} \u2014 repeated greedy dot quantifiers",pattern:/\(\.[*+]\)\{?\d/},{id:"redos-large-repetition",description:"Very large fixed or range repetition count {1000,} or {1000,n} \u2014 denial of service via backtracking",pattern:/\{\d{4,}(?:,\d*)?\}/},{id:"redos-catastrophic-alternation",description:"Long alternation with many similar branches \u2014 polynomial backtracking risk",pattern:/\([^)]{0,200}(?:\|[^|)]{0,50}){9,}\)/}],P0=SQ;var IQ=[{id:"nosql-where-operator",description:"$where \u2014 executes arbitrary JavaScript server-side in MongoDB",pattern:new RegExp(`\\$where["'\\s]*:`,"i")},{id:"nosql-ne-operator",description:'$ne \u2014 "not equal" operator used to bypass equality checks',pattern:new RegExp(`\\$ne["'\\s]*:`,"i")},{id:"nosql-gt-operator",description:'$gt \u2014 "greater than" used to bypass password/value checks',pattern:new RegExp(`\\$gte?["'\\s]*:`,"i")},{id:"nosql-lt-operator",description:'$lt / $lte \u2014 "less than" bypass variants',pattern:new RegExp(`\\$lte?["'\\s]*:`,"i")},{id:"nosql-regex-operator",description:"$regex \u2014 can be used to extract data character by character (blind injection)",pattern:new RegExp(`\\$regex["'\\s]*:`,"i")},{id:"nosql-or-operator",description:"$or \u2014 logical OR; used to create always-true conditions",pattern:new RegExp(`\\$or["'\\s]*:\\s*\\[`,"i")},{id:"nosql-and-operator",description:"$and \u2014 logical AND operator injection",pattern:new RegExp(`\\$and["'\\s]*:\\s*\\[`,"i")},{id:"nosql-nor-operator",description:"$nor \u2014 logical NOR operator injection",pattern:new RegExp(`\\$nor["'\\s]*:\\s*\\[`,"i")},{id:"nosql-exists-operator",description:"$exists \u2014 can enumerate fields to determine schema",pattern:new RegExp(`\\$exists["'\\s]*:`,"i")},{id:"nosql-in-operator",description:"$in \u2014 matches any value in a list; can enumerate values",pattern:new RegExp(`\\$in["'\\s]*:\\s*\\[`,"i")},{id:"nosql-expr-operator",description:"$expr \u2014 allows aggregation expressions in queries (MongoDB 3.6+)",pattern:new RegExp(`\\$expr["'\\s]*:`,"i")},{id:"nosql-function-operator",description:"$function \u2014 executes arbitrary JavaScript in MongoDB 4.4+",pattern:new RegExp(`\\$function["'\\s]*:`,"i")},{id:"nosql-accumulator-operator",description:"$accumulator \u2014 custom aggregation with arbitrary JS execution",pattern:new RegExp(`\\$accumulator["'\\s]*:`,"i")},{id:"nosql-proto-pollution",description:"__proto__ \u2014 prototype pollution via object key injection",pattern:/__proto__/},{id:"nosql-constructor-prototype",description:"constructor.prototype \u2014 alternative prototype pollution vector (dot notation or JSON key)",pattern:/constructor[\s"':.,{\[]*prototype/i},{id:"nosql-proto-bracket",description:'["__proto__"] \u2014 bracket-notation prototype pollution',pattern:/\[["']__proto__["']\]/}],O0=IQ;var yQ=[{id:"log-crlf-injection",description:"CRLF injection: literal \\r or \\n embeds fake log lines",pattern:/[\r\n]/},{id:"log-url-encoded-crlf",description:"URL-encoded CRLF: %0d, %0a, %0D, %0A \u2014 decoded by some log parsers",pattern:/%0[dDaA]/},{id:"log-unicode-newline",description:"Unicode newline variants: U+2028 (line separator), U+2029 (paragraph separator)",pattern:/[\u2028\u2029]/},{id:"log-log4shell-jndi",description:"Log4Shell: ${jndi:...} triggers remote code execution in Apache Log4j",pattern:/\$\{jndi\s*:/i},{id:"log-log4shell-obfuscated",description:"Obfuscated Log4Shell: ${::-j}... lookup-bypass prefix used to evade WAF detection",pattern:/\$\{::-/},{id:"log-log4j-lookup",description:"Log4j lookup syntax: ${env:...}, ${sys:...}, ${ctx:...} \u2014 data exfiltration",pattern:/\$\{(?:env|sys|ctx|main|map|sd|web|docker|k8s|spring)\s*:/i},{id:"log-ssti-double-brace",description:"SSTI double-brace: {{expression}} \u2014 Jinja2, Twig, Handlebars, etc.",pattern:/\{\{[\s\S]{0,80}\}\}/},{id:"log-ssti-hash-brace",description:"SSTI hash-brace: #{expression} \u2014 Thymeleaf, Velocity, Ruby ERB",pattern:/#\{[\s\S]{0,80}\}/},{id:"log-ssti-dollar-brace",description:"SSTI/EL injection: ${expression with operators or method calls} \u2014 JSP EL, Freemarker, SpEL",pattern:/\$\{[^}]*(?:\.|\(|\*|\+|\bclass\b|\bruntime\b|\bprocess\b|\bexec\b)[^}]{0,80}\}/i},{id:"log-ssti-percent-tag",description:"SSTI ERB/ASP tag: <%= expression %> \u2014 Ruby ERB, ASP",pattern:/<%=[\s\S]{0,80}%>/},{id:"log-null-byte",description:"Null byte: \\x00 or %00 \u2014 can truncate log entries in C-backed loggers",pattern:/\x00|%00/},{id:"log-ansi-escape",description:"ANSI escape sequence: ESC[ \u2014 can manipulate terminal output when logs are tailed",pattern:/\x1b\[/}],C0=yQ;var bQ=[{id:"sql-line-comment",description:"SQL line comment: -- followed by whitespace or end of string",pattern:/--(?:\s|$)/},{id:"sql-stacked-query",description:"Stacked queries: semicolon immediately followed by a SQL keyword",pattern:/;\s{0,10}(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b/i},{id:"sql-hex-encoding",description:"Hex-encoded string injection: 0x41414141 style (MySQL)",pattern:/\b0x[0-9a-f]{4,}/i}],fQ=[...p6,...bQ],A0=fQ;V6.label="HTML";L6.label="XML";j0.label="SVG";p6.label="SQL";A0.label="SQL-STRICT";M0.label="SHELL";P0.label="REDOS";O0.label="NOSQL";C0.label="LOG";var cz=Object.freeze({HTML:V6,XML:L6,SVG:j0,SQL:p6,"SQL-STRICT":A0,SHELL:M0,REDOS:P0,NOSQL:O0,LOG:C0});function vQ(J){if(typeof J!=="string")throw TypeError(`is-unsafe: first argument must be a string, got ${typeof J}`)}function _Q(J){if(J instanceof RegExp)return;if(Array.isArray(J)){if(J.length===0)throw TypeError("is-unsafe: context must not be an empty array");if(Array.isArray(J[0])){for(let W of J)if(!Array.isArray(W)||W.length===0)throw TypeError("is-unsafe: each context in the array must be a non-empty pattern array (PatternList)")}return}throw TypeError(`is-unsafe: second argument must be a PatternList (e.g. HTML), an array of PatternLists (e.g. [HTML, XML]), or a RegExp. Got: ${typeof J}`)}function xQ(J){if(J instanceof RegExp)return{lists:null,regex:J};if(Array.isArray(J[0]))return{lists:J,regex:null};return{lists:[J],regex:null}}function hQ(J,W){let Q=W.label??"CUSTOM";for(let G of W)if(G.pattern.test(J))return{context:Q,id:G.id,description:G.description,pattern:G.pattern};return null}function U7(J,W){vQ(J),_Q(W);let{lists:Q,regex:G}=xQ(W);if(G)return G.test(J);for(let z of Q)if(hQ(J,z)!==null)return!0;return!1}function uQ(J,W){if(!J)return{};let Q=W.attributesGroupName?J[W.attributesGroupName]:J;if(!Q)return{};let G={};for(let z in Q)if(z.startsWith(W.attributeNamePrefix)){let Y=z.substring(W.attributeNamePrefix.length);G[Y]=Q[z]}else G[z]=Q[z];return G}function gQ(J){if(!J||typeof J!=="string")return;let W=J.indexOf(":");if(W!==-1&&W>0){let Q=J.substring(0,W);if(Q!=="xmlns")return Q}return}class w8{constructor(J,W){this.options=J,this.currentNode=null,this.tagsNodeStack=[],this.parseXml=lQ,this.parseTextData=cQ,this.resolveNameSpace=mQ,this.buildAttributesMap=dQ,this.isItStopNode=oQ,this.replaceEntitiesValue=nQ,this.readStopNodeData=tQ,this.saveTextToParentTag=rQ,this.addChild=iQ,this.ignoreAttributesFn=B0(this.options.ignoreAttributes),this.entityExpansionCount=0,this.currentExpandedLength=0,this.doctypefound=!1;let Q={...x6};if(this.options.entityDecoder)this.entityDecoder=this.options.entityDecoder;else{if(typeof this.options.htmlEntities==="object")Q=this.options.htmlEntities;else if(this.options.htmlEntities===!0)Q={...X0,...K0};this.entityDecoder=new u6({namedEntities:{...Q,...W},numericAllowed:this.options.htmlEntities,limit:{maxTotalExpansions:this.options.processEntities.maxTotalExpansions,maxExpandedLength:this.options.processEntities.maxExpandedLength,applyLimitsTo:this.options.processEntities.appliesTo},onInputEntity:(z,Y)=>U7(Y,[V6,L6])?q6.BLOCK:q6.ALLOW})}this.matcher=new y5,this.readonlyMatcher=this.matcher.readOnly(),this.isCurrentNodeStopNode=!1,this.stopNodeExpressionsSet=new m6;let G=this.options.stopNodes;if(G&&G.length>0){for(let z=0;z<G.length;z++){let Y=G[z];if(typeof Y==="string")this.stopNodeExpressionsSet.add(new B5(Y));else if(Y instanceof B5)this.stopNodeExpressionsSet.add(Y)}this.stopNodeExpressionsSet.seal()}}}function cQ(J,W,Q,G,z,Y,Z){let K=this.options;if(J!==void 0){if(K.trimValues&&!G)J=J.trim();if(J.length>0){if(!Z)J=this.replaceEntitiesValue(J,W,Q);let $=K.jPath?Q.toString():Q,U=K.tagValueProcessor(W,J,$,z,Y);if(U===null||U===void 0)return J;else if(typeof U!==typeof J||U!==J)return U;else if(K.trimValues)return E0(J,K.parseTagValue,K.numberParseOptions);else if(J.trim()===J)return E0(J,K.parseTagValue,K.numberParseOptions);else return J}}}function mQ(J){if(this.options.removeNSPrefix){let W=J.split(":"),Q=J.charAt(0)==="/"?"/":"";if(W[0]==="xmlns")return"";if(W.length===2)J=Q+W[1]}return J}var pQ=new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`,"gm");function dQ(J,W,Q,G=!1){let z=this.options;if(G===!0||z.ignoreAttributes!==!0&&typeof J==="string"){let Y=B8(J,pQ),Z=Y.length,K={},$=Array(Z),U=!1,X={};for(let q=0;q<Z;q++){let L=this.resolveNameSpace(Y[q][1]),V=Y[q][4];if(L.length&&V!==void 0){let B=V;if(z.trimValues)B=B.trim();B=this.replaceEntitiesValue(B,Q,this.readonlyMatcher),$[q]=B,X[L]=B,U=!0}}if(U&&typeof W==="object"&&W.updateCurrent)W.updateCurrent(X);let H=z.jPath?W.toString():this.readonlyMatcher,F=!1;for(let q=0;q<Z;q++){let L=this.resolveNameSpace(Y[q][1]);if(this.ignoreAttributesFn(L,H))continue;let V=z.attributeNamePrefix+L;if(L.length){if(z.transformAttributeName)V=z.transformAttributeName(V);if(V=Z7(V,z),Y[q][4]!==void 0){let B=$[q],P=z.attributeValueProcessor(L,B,H);if(P===null||P===void 0)K[V]=B;else if(typeof P!==typeof B||P!==B)K[V]=P;else K[V]=E0(B,z.parseAttributeValue,z.numberParseOptions);F=!0}else if(z.allowBooleanAttributes)K[V]=!0,F=!0}}if(!F)return;if(z.attributesGroupName&&!z.preserveOrder){let q={};return q[z.attributesGroupName]=K,q}return K}}var lQ=function(J){J=J.replace(/\r\n?/g,`
`);let W=new F5("!xml"),Q=W,G="";this.matcher.reset(),this.entityDecoder.reset(),this.entityExpansionCount=0,this.currentExpandedLength=0,this.doctypefound=!1;let z=this.options,Y=new A8(z.processEntities),Z=J.length;for(let K=0;K<Z;K++)if(J[K]==="<"){let U=J.charCodeAt(K+1);if(U===47){let X=B6(J,">",K,"Closing Tag is not closed."),H=J.substring(K+2,X).trim();if(z.removeNSPrefix){let q=H.indexOf(":");if(q!==-1)H=H.substr(q+1)}if(H=R0(z.transformTagName,H,"",z).tagName,Q)G=this.saveTextToParentTag(G,Q,this.readonlyMatcher);let F=this.matcher.getCurrentTag();if(H&&z.unpairedTagsSet.has(H))throw Error(`Unpaired tag can not be used as closing tag: </${H}>`);if(F&&z.unpairedTagsSet.has(F))this.matcher.pop(),this.tagsNodeStack.pop();this.matcher.pop(),this.isCurrentNodeStopNode=!1,Q=this.tagsNodeStack.pop(),G="",K=X}else if(U===63){let X=T0(J,K,!1,"?>");if(!X)throw Error("Pi Tag is not closed.");G=this.saveTextToParentTag(G,Q,this.readonlyMatcher);let H=this.buildAttributesMap(X.tagExp,this.matcher,X.tagName,!0);if(H){let F=H[this.options.attributeNamePrefix+"version"];this.entityDecoder.setXmlVersion(Number(F)||1),Y.setXmlVersion(Number(F)||1)}if(z.ignoreDeclaration&&X.tagName==="?xml"||z.ignorePiTags);else{let F=new F5(X.tagName);if(F.add(z.textNodeName,""),X.tagName!==X.tagExp&&X.attrExpPresent&&z.ignoreAttributes!==!0)F[":@"]=H;this.addChild(Q,F,this.readonlyMatcher,K)}K=X.closeIndex+1}else if(U===33&&J.charCodeAt(K+2)===45&&J.charCodeAt(K+3)===45){let X=B6(J,"-->",K+4,"Comment is not closed.");if(z.commentPropName){let H=J.substring(K+4,X-2);G=this.saveTextToParentTag(G,Q,this.readonlyMatcher),Q.add(z.commentPropName,[{[z.textNodeName]:H}])}K=X}else if(U===33&&J.charCodeAt(K+2)===68){if(this.doctypefound)throw Error("Multiple DOCTYPE declarations found.");this.doctypefound=!0;let X=Y.readDocType(J,K);this.entityDecoder.addInputEntities(X.entities),K=X.i}else if(U===33&&J.charCodeAt(K+2)===91){let X=B6(J,"]]>",K,"CDATA is not closed.")-2,H=J.substring(K+9,X);G=this.saveTextToParentTag(G,Q,this.readonlyMatcher);let F=this.parseTextData(H,Q.tagname,this.readonlyMatcher,!0,!1,!0,!0);if(F==null)F="";if(z.cdataPropName)Q.add(z.cdataPropName,[{[z.textNodeName]:H}]);else Q.add(z.textNodeName,F);K=X+2}else{let X=T0(J,K,z.removeNSPrefix);if(!X){let E=J.substring(Math.max(0,K-50),Math.min(Z,K+50));throw Error(`readTagExp returned undefined at position ${K}. Context: "${E}"`)}let{tagName:H,rawTagName:F,tagExp:q,attrExpPresent:L,closeIndex:V}=X;if({tagName:H,tagExp:q}=R0(z.transformTagName,H,q,z),z.strictReservedNames&&(H===z.commentPropName||H===z.cdataPropName||H===z.textNodeName||H===z.attributesGroupName))throw Error(`Invalid tag name: ${H}`);if(Q&&G){if(Q.tagname!=="!xml")G=this.saveTextToParentTag(G,Q,this.readonlyMatcher,!1)}let B=Q;if(B&&z.unpairedTagsSet.has(B.tagname))Q=this.tagsNodeStack.pop(),this.matcher.pop();let P=!1;if(q.length>0&&q.lastIndexOf("/")===q.length-1){if(P=!0,H[H.length-1]==="/")H=H.substr(0,H.length-1),q=H;else q=q.substr(0,q.length-1);L=H!==q}let j=null,O={},M=void 0;if(M=gQ(F),H!==W.tagname)this.matcher.push(H,{},M);if(H!==q&&L){if(j=this.buildAttributesMap(q,this.matcher,H),j)O=uQ(j,z)}if(H!==W.tagname)this.isCurrentNodeStopNode=this.isItStopNode();let R=K;if(this.isCurrentNodeStopNode){let E="";if(P)K=X.closeIndex;else if(z.unpairedTagsSet.has(H))K=X.closeIndex;else{let N=this.readStopNodeData(J,F,V+1);if(!N)throw Error(`Unexpected end of ${F}`);K=N.i,E=N.tagContent}let A=new F5(H);if(j)A[":@"]=j;A.add(z.textNodeName,E),this.matcher.pop(),this.isCurrentNodeStopNode=!1,this.addChild(Q,A,this.readonlyMatcher,R)}else{if(P){({tagName:H,tagExp:q}=R0(z.transformTagName,H,q,z));let E=new F5(H);if(j)E[":@"]=j;this.addChild(Q,E,this.readonlyMatcher,R),this.matcher.pop(),this.isCurrentNodeStopNode=!1}else if(z.unpairedTagsSet.has(H)){let E=new F5(H);if(j)E[":@"]=j;this.addChild(Q,E,this.readonlyMatcher,R),this.matcher.pop(),this.isCurrentNodeStopNode=!1,K=X.closeIndex;continue}else{let E=new F5(H);if(this.tagsNodeStack.length>z.maxNestedTags)throw Error("Maximum nested tags exceeded");if(this.tagsNodeStack.push(Q),j)E[":@"]=j;this.addChild(Q,E,this.readonlyMatcher,R),Q=E}G="",K=V}}}else G+=J[K];return W.child};function iQ(J,W,Q,G){if(!this.options.captureMetaData)G=void 0;let z=this.options.jPath?Q.toString():Q,Y=this.options.updateTag(W.tagname,z,W[":@"]);if(Y===!1);else if(typeof Y==="string")W.tagname=Y,J.addChild(W,G);else J.addChild(W,G)}function nQ(J,W,Q){let G=this.options.processEntities;if(!G||!G.enabled)return J;if(G.allowedTags){let z=this.options.jPath?Q.toString():Q;if(!(Array.isArray(G.allowedTags)?G.allowedTags.includes(W):G.allowedTags(W,z)))return J}if(G.tagFilter){let z=this.options.jPath?Q.toString():Q;if(!G.tagFilter(W,z))return J}return this.entityDecoder.decode(J)}function rQ(J,W,Q,G){if(J){if(G===void 0)G=W.child.length===0;if(J=this.parseTextData(J,W.tagname,Q,!1,W[":@"]?Object.keys(W[":@"]).length!==0:!1,G),J!==void 0&&J!=="")W.add(this.options.textNodeName,J);J=""}return J}function oQ(){if(this.stopNodeExpressionsSet.size===0)return!1;return this.matcher.matchesAny(this.stopNodeExpressionsSet)}function aQ(J,W,Q=">"){let G=0,z=J.length,Y=Q.charCodeAt(0),Z=Q.length>1?Q.charCodeAt(1):-1,K="",$=W;for(let U=W;U<z;U++){let X=J.charCodeAt(U);if(G){if(X===G)G=0}else if(X===34||X===39)G=X;else if(X===Y)if(Z!==-1){if(J.charCodeAt(U+1)===Z)return K+=J.substring($,U),{data:K,index:U}}else return K+=J.substring($,U),{data:K,index:U};else if(X===9&&!G)K+=J.substring($,U)+" ",$=U+1}}function B6(J,W,Q,G){let z=J.indexOf(W,Q);if(z===-1)throw Error(G);else return z+W.length-1}function sQ(J,W,Q,G){let z=J.indexOf(W,Q);if(z===-1)throw Error(G);return z}function T0(J,W,Q,G=">"){let z=aQ(J,W+1,G);if(!z)return;let{data:Y,index:Z}=z,K=Y.search(/\s/),$=Y,U=!0;if(K!==-1)$=Y.substring(0,K),Y=Y.substring(K+1).trimStart();let X=$;if(Q){let H=$.indexOf(":");if(H!==-1)$=$.substr(H+1),U=$!==z.data.substr(H+1)}return{tagName:$,tagExp:Y,closeIndex:Z,attrExpPresent:U,rawTagName:X}}function tQ(J,W,Q){let G=Q,z=1,Y=J.length;for(;Q<Y;Q++)if(J[Q]==="<"){let Z=J.charCodeAt(Q+1);if(Z===47){let K=sQ(J,">",Q,`${W} is not closed`);if(J.substring(Q+2,K).trim()===W){if(z--,z===0)return{tagContent:J.substring(G,Q),i:K}}Q=K}else if(Z===63)Q=B6(J,"?>",Q+1,"StopNode is not closed.");else if(Z===33&&J.charCodeAt(Q+2)===45&&J.charCodeAt(Q+3)===45)Q=B6(J,"-->",Q+3,"StopNode is not closed.");else if(Z===33&&J.charCodeAt(Q+2)===91)Q=B6(J,"]]>",Q,"StopNode is not closed.")-2;else{let K=T0(J,Q,!1);if(K){if((K&&K.tagName)===W&&K.tagExp[K.tagExp.length-1]!=="/")z++;Q=K.closeIndex}}}}function E0(J,W,Q){if(W&&typeof J==="string"){let G=J.trim();if(G==="true")return!0;else if(G==="false")return!1;else return L0(J,Q)}else if(mJ(J))return J;else return""}function R0(J,W,Q,G){if(J){let z=J(W);if(Q===W)Q=z;W=z}return W=Z7(W,G),{tagName:W,tagExp:Q}}function Z7(J,W){if(j8.includes(J))throw Error(`[SECURITY] Invalid name: "${J}" is a reserved JavaScript keyword that could cause prototype pollution`);else if(v6.includes(J))return W.onDangerousProperty(J);return J}var w0=F5.getMetaDataSymbol();function eQ(J,W){if(!J||typeof J!=="object")return{};if(!W)return J;let Q={};for(let G in J)if(G.startsWith(W)){let z=G.substring(W.length);Q[z]=J[G]}else Q[G]=J[G];return Q}function N0(J,W,Q,G){return K7(J,W,Q,G)}function K7(J,W,Q,G){let z,Y={};for(let Z=0;Z<J.length;Z++){let K=J[Z],$=JW(K);if($!==void 0&&$!==W.textNodeName){let U=eQ(K[":@"]||{},W.attributeNamePrefix);Q.push($,U)}if($===W.textNodeName)if(z===void 0)z=K[$];else z+=""+K[$];else if($===void 0)continue;else if(K[$]){let U=K7(K[$],W,Q,G),X=WW(U,W);if(Object.keys(U).length===0&&W.alwaysCreateTextNode)U[W.textNodeName]="";if(K[":@"])QW(U,K[":@"],G,W);else if(Object.keys(U).length===1&&U[W.textNodeName]!==void 0&&!W.alwaysCreateTextNode)U=U[W.textNodeName];else if(Object.keys(U).length===0)if(W.alwaysCreateTextNode)U[W.textNodeName]="";else U="";if(K[w0]!==void 0&&typeof U==="object"&&U!==null)U[w0]=K[w0];if(Y[$]!==void 0&&Object.prototype.hasOwnProperty.call(Y,$)){if(!Array.isArray(Y[$]))Y[$]=[Y[$]];Y[$].push(U)}else{let H=W.jPath?G.toString():G;if(W.isArray($,H,X))Y[$]=[U];else Y[$]=U}if($!==void 0&&$!==W.textNodeName)Q.pop()}}if(typeof z==="string"){if(z.length>0)Y[W.textNodeName]=z}else if(z!==void 0)Y[W.textNodeName]=z;return Y}function JW(J){let W=Object.keys(J);for(let Q=0;Q<W.length;Q++){let G=W[Q];if(G!==":@")return G}}function QW(J,W,Q,G){if(W){let z=Object.keys(W),Y=z.length;for(let Z=0;Z<Y;Z++){let K=z[Z],$=K.startsWith(G.attributeNamePrefix)?K.substring(G.attributeNamePrefix.length):K,U=G.jPath?Q.toString()+"."+$:Q;if(G.isArray(K,U,!0,!0))J[K]=[W[K]];else J[K]=W[K]}}}function WW(J,W){let{textNodeName:Q}=W,G=Object.keys(J).length;if(G===0)return!0;if(G===1&&(J[Q]||typeof J[Q]==="boolean"||J[Q]===0))return!0;return!1}class d6{constructor(J){this.externalEntities={},this.options=aJ(J)}parse(J,W){if(typeof J!=="string"&&J.toString)J=J.toString();else if(typeof J!=="string")throw Error("XML data is accepted in String or Bytes[] form.");if(W){if(W===!0)W={};let z=M8(J,W);if(z!==!0)throw Error(`${z.err.msg}:${z.err.line}:${z.err.col}`)}let Q=new w8(this.options,this.externalEntities),G=Q.parseXml(J);if(this.options.preserveOrder||G===void 0)return G;else return N0(G,this.options,Q.matcher,Q.readonlyMatcher)}addEntity(J,W){if(W.indexOf("&")!==-1)throw Error("Entity value can't have '&'");else if(J.indexOf("&")!==-1||J.indexOf(";")!==-1)throw Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");else if(W==="&")throw Error("An entity with value '&' is not permitted");else this.externalEntities[J]=W}static getMetaDataSymbol(){return F5.getMetaDataSymbol()}}function l6(J){return String(J).replace(/--/g,"- -").replace(/--/g,"- -").replace(/-$/,"- ")}function N8(J){return String(J).replace(/\]\]>/g,"]]]]><![CDATA[>")}function R5(J){return String(J).replace(/"/g,"&quot;").replace(/'/g,"&apos;")}var YW=`
`;function GW(J,W){if(!Array.isArray(J)||J.length===0)return"1.0";let Q=J[0];if(S0(Q)==="?xml"){let z=Q[":@"];if(z){let Y=W.attributeNamePrefix+"version";if(z[Y])return z[Y]}}return"1.0"}function F7(J,W,Q,G,z){if(!Q.sanitizeName)return J;if(z(J))return J;return Q.sanitizeName(J,{isAttribute:W,matcher:G.readOnly()})}function k0(J,W){let Q="";if(W.format)Q=YW;let G=[];if(W.stopNodes&&Array.isArray(W.stopNodes))for(let K=0;K<W.stopNodes.length;K++){let $=W.stopNodes[K];if(typeof $==="string")G.push(new B5($));else if($ instanceof B5)G.push($)}let z=GW(J,W),Y=C8("qName",{xmlVersion:z}),Z=new y5;return H7(J,W,Q,Z,G,Y)}function H7(J,W,Q,G,z,Y){let Z="",K=!1;if(W.maxNestedTags&&G.getDepth()>W.maxNestedTags)throw Error("Maximum nested tags exceeded");if(!Array.isArray(J)){if(J!==void 0&&J!==null){let $=J.toString();return $=D0($,W),$}return""}for(let $=0;$<J.length;$++){let U=J[$],X=S0(U);if(X===void 0)continue;let F=X===W.textNodeName||X===W.cdataPropName||X===W.commentPropName||X[0]==="?"?X:F7(X,!1,W,G,Y),q=zW(U[":@"],W);G.push(F,q);let L=ZW(G,z);if(F===W.textNodeName){let O=U[X];if(!L)O=W.tagValueProcessor(F,O),O=D0(O,W);if(K)Z+=Q;Z+=O,K=!1,G.pop();continue}else if(F===W.cdataPropName){if(K)Z+=Q;let O=U[X][0][W.textNodeName],M=N8(O);Z+=`<![CDATA[${M}]]>`,K=!1,G.pop();continue}else if(F===W.commentPropName){let O=U[X][0][W.textNodeName],M=l6(O);Z+=Q+`<!--${M}-->`,K=!0,G.pop();continue}else if(F[0]==="?"){let O=X7(U[":@"],W,L,G,Y);Z+=(F==="?xml"?"":Q)+`<${F}${O}?>`,K=!0,G.pop();continue}let V=Q;if(V!=="")V+=W.indentBy;let B=X7(U[":@"],W,L,G,Y),P=Q+`<${F}${B}`,j;if(L)j=$7(U[X],W);else j=H7(U[X],W,V,G,z,Y);if(W.unpairedTags.indexOf(F)!==-1)if(W.suppressUnpairedNode)Z+=P+">";else Z+=P+"/>";else if((!j||j.length===0)&&W.suppressEmptyNode)Z+=P+"/>";else if(j&&j.endsWith(">"))Z+=P+`>${j}${Q}</${F}>`;else{if(Z+=P+">",j&&Q!==""&&(j.includes("/>")||j.includes("</")))Z+=Q+W.indentBy+j+Q;else Z+=j;Z+=`</${F}>`}K=!0,G.pop()}return Z}function zW(J,W){if(!J||W.ignoreAttributes)return null;let Q={},G=!1;for(let z in J){if(!Object.prototype.hasOwnProperty.call(J,z))continue;let Y=z.startsWith(W.attributeNamePrefix)?z.substr(W.attributeNamePrefix.length):z;Q[Y]=R5(J[z]),G=!0}return G?Q:null}function $7(J,W){if(!Array.isArray(J)){if(J!==void 0&&J!==null)return J.toString();return""}let Q="";for(let G=0;G<J.length;G++){let z=J[G],Y=S0(z);if(Y===W.textNodeName)Q+=z[Y];else if(Y===W.cdataPropName)Q+=z[Y][0][W.textNodeName];else if(Y===W.commentPropName)Q+=z[Y][0][W.textNodeName];else if(Y&&Y[0]==="?")continue;else if(Y){let Z=UW(z[":@"],W),K=$7(z[Y],W);if(!K||K.length===0)Q+=`<${Y}${Z}/>`;else Q+=`<${Y}${Z}>${K}</${Y}>`}}return Q}function UW(J,W){let Q="";if(J&&!W.ignoreAttributes)for(let G in J){if(!Object.prototype.hasOwnProperty.call(J,G))continue;let z=J[G];if(z===!0&&W.suppressBooleanAttributes)Q+=` ${G.substr(W.attributeNamePrefix.length)}`;else Q+=` ${G.substr(W.attributeNamePrefix.length)}="${R5(z)}"`}return Q}function S0(J){let W=Object.keys(J);for(let Q=0;Q<W.length;Q++){let G=W[Q];if(!Object.prototype.hasOwnProperty.call(J,G))continue;if(G!==":@")return G}}function X7(J,W,Q,G,z){let Y="";if(J&&!W.ignoreAttributes)for(let Z in J){if(!Object.prototype.hasOwnProperty.call(J,Z))continue;let K=Z.substr(W.attributeNamePrefix.length),$=Q?K:F7(K,!0,W,G,z),U;if(Q)U=J[Z];else U=W.attributeValueProcessor(Z,J[Z]),U=D0(U,W);if(U===!0&&W.suppressBooleanAttributes)Y+=` ${$}`;else Y+=` ${$}="${R5(U)}"`}return Y}function ZW(J,W){if(!W||W.length===0)return!1;for(let Q=0;Q<W.length;Q++)if(J.matches(W[Q]))return!0;return!1}function D0(J,W){if(J&&J.length>0&&W.processEntities)for(let Q=0;Q<W.entities.length;Q++){let G=W.entities[Q];J=J.replace(G.regex,G.val)}return J}function I0(J){if(typeof J==="function")return J;if(Array.isArray(J))return(W)=>{for(let Q of J){if(typeof Q==="string"&&W===Q)return!0;if(Q instanceof RegExp&&Q.test(W))return!0}};return()=>!1}var KW={attributeNamePrefix:"@_",attributesGroupName:!1,textNodeName:"#text",ignoreAttributes:!0,cdataPropName:!1,format:!1,indentBy:"  ",suppressEmptyNode:!1,suppressUnpairedNode:!0,suppressBooleanAttributes:!0,tagValueProcessor:function(J,W){return W},attributeValueProcessor:function(J,W){return W},preserveOrder:!1,commentPropName:!1,unpairedTags:[],entities:[{regex:new RegExp("&","g"),val:"&amp;"},{regex:new RegExp(">","g"),val:"&gt;"},{regex:new RegExp("<","g"),val:"&lt;"},{regex:new RegExp("'","g"),val:"&apos;"},{regex:new RegExp('"',"g"),val:"&quot;"}],processEntities:!0,stopNodes:[],oneListGroup:!1,maxNestedTags:100,jPath:!0,sanitizeName:!1};function z5(J){if(this.options=Object.assign({},KW,J),this.options.stopNodes&&Array.isArray(this.options.stopNodes))this.options.stopNodes=this.options.stopNodes.map((W)=>{if(typeof W==="string"&&W.startsWith("*."))return"."+"."+W.substring(2);return W});if(this.stopNodeExpressions=[],this.options.stopNodes&&Array.isArray(this.options.stopNodes))for(let W=0;W<this.options.stopNodes.length;W++){let Q=this.options.stopNodes[W];if(typeof Q==="string")this.stopNodeExpressions.push(new B5(Q));else if(Q instanceof B5)this.stopNodeExpressions.push(Q)}if(this.options.ignoreAttributes===!0||this.options.attributesGroupName)this.isAttribute=function(){return!1};else this.ignoreAttributesFn=I0(this.options.ignoreAttributes),this.attrPrefixLen=this.options.attributeNamePrefix.length,this.isAttribute=$W;if(this.processTextOrObjNode=FW,this.options.format)this.indentate=HW,this.tagEndChar=`>
`,this.newLine=`
`;else this.indentate=function(){return""},this.tagEndChar=">",this.newLine=""}function XW(J,W){let Q=J["?xml"];if(Q&&typeof Q==="object"){if(W.attributesGroupName&&Q[W.attributesGroupName]){let z=Q[W.attributesGroupName][W.attributeNamePrefix+"version"];if(z)return z}let G=Q[W.attributeNamePrefix+"version"];if(G)return G}return"1.0"}function y0(J,W,Q,G,z){if(!Q.sanitizeName)return J;if(z(J))return J;return Q.sanitizeName(J,{isAttribute:W,matcher:G.readOnly()})}z5.prototype.build=function(J){if(this.options.preserveOrder)return k0(J,this.options);else{if(Array.isArray(J)&&this.options.arrayNodeName&&this.options.arrayNodeName.length>1)J={[this.options.arrayNodeName]:J};let W=new y5,Q=XW(J,this.options),G=C8("qName",{xmlVersion:Q});return this.j2x(J,0,W,G).val}};z5.prototype.j2x=function(J,W,Q,G){let z="",Y="";if(this.options.maxNestedTags&&Q.getDepth()>=this.options.maxNestedTags)throw Error("Maximum nested tags exceeded");let Z=this.options.jPath?Q.toString():Q,K=this.checkStopNode(Q);for(let $ in J){if(!Object.prototype.hasOwnProperty.call(J,$))continue;let X=$===this.options.textNodeName||$===this.options.cdataPropName||$===this.options.commentPropName||this.options.attributesGroupName&&$===this.options.attributesGroupName||this.isAttribute($)||$[0]==="?"?$:y0($,!1,this.options,Q,G);if(typeof J[$]>"u"){if(this.isAttribute($))Y+=""}else if(J[$]===null)if(this.isAttribute($))Y+="";else if(X===this.options.cdataPropName||X===this.options.commentPropName)Y+="";else if(X[0]==="?")Y+=this.indentate(W)+"<"+X+"?"+this.tagEndChar;else Y+=this.indentate(W)+"<"+X+"/"+this.tagEndChar;else if(J[$]instanceof Date)Y+=this.buildTextValNode(J[$],X,"",W,Q);else if(typeof J[$]!=="object"){let H=this.isAttribute($);if(H&&!this.ignoreAttributesFn(H,Z)){let F=y0(H,!0,this.options,Q,G);z+=this.buildAttrPairStr(F,""+J[$],K)}else if(!H)if($===this.options.textNodeName){let F=this.options.tagValueProcessor($,""+J[$]);Y+=this.replaceEntitiesValue(F)}else{Q.push(X);let F=this.checkStopNode(Q);if(Q.pop(),F){let q=""+J[$];if(q==="")Y+=this.indentate(W)+"<"+X+this.closeTag(X)+this.tagEndChar;else Y+=this.indentate(W)+"<"+X+">"+q+"</"+X+this.tagEndChar}else Y+=this.buildTextValNode(J[$],X,"",W,Q)}}else if(Array.isArray(J[$])){let H=J[$].length,F="",q="";for(let L=0;L<H;L++){let V=J[$][L];if(typeof V>"u");else if(V===null)if(X[0]==="?")Y+=this.indentate(W)+"<"+X+"?"+this.tagEndChar;else Y+=this.indentate(W)+"<"+X+"/"+this.tagEndChar;else if(typeof V==="object")if(this.options.oneListGroup){Q.push(X);let B=this.j2x(V,W+1,Q,G);if(Q.pop(),F+=B.val,this.options.attributesGroupName&&V.hasOwnProperty(this.options.attributesGroupName))q+=B.attrStr}else F+=this.processTextOrObjNode(V,X,W,Q,G);else if(this.options.oneListGroup){let B=this.options.tagValueProcessor(X,V);B=this.replaceEntitiesValue(B),F+=B}else{Q.push(X);let B=this.checkStopNode(Q);if(Q.pop(),B){let P=""+V;if(P==="")F+=this.indentate(W)+"<"+X+this.closeTag(X)+this.tagEndChar;else F+=this.indentate(W)+"<"+X+">"+P+"</"+X+this.tagEndChar}else F+=this.buildTextValNode(V,X,"",W,Q)}}if(this.options.oneListGroup)F=this.buildObjectNode(F,X,q,W);Y+=F}else if(this.options.attributesGroupName&&$===this.options.attributesGroupName){let H=Object.keys(J[$]),F=H.length;for(let q=0;q<F;q++){let L=y0(H[q],!0,this.options,Q,G);z+=this.buildAttrPairStr(L,""+J[$][H[q]],K)}}else Y+=this.processTextOrObjNode(J[$],X,W,Q,G)}return{attrStr:z,val:Y}};z5.prototype.buildAttrPairStr=function(J,W,Q){if(!Q)W=this.options.attributeValueProcessor(J,""+W),W=this.replaceEntitiesValue(W);if(this.options.suppressBooleanAttributes&&W==="true")return" "+J;else return" "+J+'="'+R5(W)+'"'};function FW(J,W,Q,G,z){let Y=this.extractAttributes(J);if(G.push(W,Y),this.checkStopNode(G)){let $=this.buildRawContent(J),U=this.buildAttributesForStopNode(J);return G.pop(),this.buildObjectNode($,W,U,Q)}let K=this.j2x(J,Q+1,G,z);if(G.pop(),W[0]==="?")return this.buildTextValNode("",W,K.attrStr,Q,G);else if(J[this.options.textNodeName]!==void 0&&Object.keys(J).length===1)return this.buildTextValNode(J[this.options.textNodeName],W,K.attrStr,Q,G);else return this.buildObjectNode(K.val,W,K.attrStr,Q)}z5.prototype.extractAttributes=function(J){if(!J||typeof J!=="object")return null;let W={},Q=!1;if(this.options.attributesGroupName&&J[this.options.attributesGroupName]){let G=J[this.options.attributesGroupName];for(let z in G){if(!Object.prototype.hasOwnProperty.call(G,z))continue;let Y=z.startsWith(this.options.attributeNamePrefix)?z.substring(this.options.attributeNamePrefix.length):z;W[Y]=R5(G[z]),Q=!0}}else for(let G in J){if(!Object.prototype.hasOwnProperty.call(J,G))continue;let z=this.isAttribute(G);if(z)W[z]=R5(J[G]),Q=!0}return Q?W:null};z5.prototype.buildRawContent=function(J){if(typeof J==="string")return J;if(typeof J!=="object"||J===null)return String(J);if(J[this.options.textNodeName]!==void 0)return J[this.options.textNodeName];let W="";for(let Q in J){if(!Object.prototype.hasOwnProperty.call(J,Q))continue;if(this.isAttribute(Q))continue;if(this.options.attributesGroupName&&Q===this.options.attributesGroupName)continue;let G=J[Q];if(Q===this.options.textNodeName)W+=G;else if(Array.isArray(G)){for(let z of G)if(typeof z==="string"||typeof z==="number")W+=`<${Q}>${z}</${Q}>`;else if(typeof z==="object"&&z!==null){let Y=this.buildRawContent(z),Z=this.buildAttributesForStopNode(z);if(Y==="")W+=`<${Q}${Z}/>`;else W+=`<${Q}${Z}>${Y}</${Q}>`}}else if(typeof G==="object"&&G!==null){let z=this.buildRawContent(G),Y=this.buildAttributesForStopNode(G);if(z==="")W+=`<${Q}${Y}/>`;else W+=`<${Q}${Y}>${z}</${Q}>`}else W+=`<${Q}>${G}</${Q}>`}return W};z5.prototype.buildAttributesForStopNode=function(J){if(!J||typeof J!=="object")return"";let W="";if(this.options.attributesGroupName&&J[this.options.attributesGroupName]){let Q=J[this.options.attributesGroupName];for(let G in Q){if(!Object.prototype.hasOwnProperty.call(Q,G))continue;let z=G.startsWith(this.options.attributeNamePrefix)?G.substring(this.options.attributeNamePrefix.length):G,Y=Q[G];if(Y===!0&&this.options.suppressBooleanAttributes)W+=" "+z;else W+=" "+z+'="'+R5(Y)+'"'}}else for(let Q in J){if(!Object.prototype.hasOwnProperty.call(J,Q))continue;let G=this.isAttribute(Q);if(G){let z=J[Q];if(z===!0&&this.options.suppressBooleanAttributes)W+=" "+G;else W+=" "+G+'="'+R5(z)+'"'}}return W};z5.prototype.buildObjectNode=function(J,W,Q,G){if(J==="")if(W[0]==="?")return this.indentate(G)+"<"+W+Q+"?"+this.tagEndChar;else return this.indentate(G)+"<"+W+Q+this.closeTag(W)+this.tagEndChar;else if(W[0]==="?")return this.indentate(G)+"<"+W+Q+"?"+this.tagEndChar;else{let z="</"+W+this.tagEndChar,Y="";if(W[0]==="?")Y="?",z="";if((Q||Q==="")&&J.indexOf("<")===-1)return this.indentate(G)+"<"+W+Q+Y+">"+J+z;else if(this.options.commentPropName!==!1&&W===this.options.commentPropName&&Y.length===0)return this.indentate(G)+`<!--${l6(J)}-->`+this.newLine;else return this.indentate(G)+"<"+W+Q+Y+this.tagEndChar+J+this.indentate(G)+z}};z5.prototype.closeTag=function(J){let W="";if(this.options.unpairedTags.indexOf(J)!==-1){if(!this.options.suppressUnpairedNode)W="/"}else if(this.options.suppressEmptyNode)W="/";else W=`></${J}`;return W};z5.prototype.checkStopNode=function(J){if(!this.stopNodeExpressions||this.stopNodeExpressions.length===0)return!1;for(let W=0;W<this.stopNodeExpressions.length;W++)if(J.matches(this.stopNodeExpressions[W]))return!0;return!1};z5.prototype.buildTextValNode=function(J,W,Q,G,z){if(this.options.cdataPropName!==!1&&W===this.options.cdataPropName){let Y=N8(J);return this.indentate(G)+`<![CDATA[${Y}]]>`+this.newLine}else if(this.options.commentPropName!==!1&&W===this.options.commentPropName){let Y=l6(J);return this.indentate(G)+`<!--${Y}-->`+this.newLine}else if(W[0]==="?")return this.indentate(G)+"<"+W+Q+"?"+this.tagEndChar;else{let Y=this.options.tagValueProcessor(W,J);if(Y=this.replaceEntitiesValue(Y),Y==="")return this.indentate(G)+"<"+W+Q+this.closeTag(W)+this.tagEndChar;else return this.indentate(G)+"<"+W+Q+">"+Y+"</"+W+this.tagEndChar}};z5.prototype.replaceEntitiesValue=function(J){if(J&&J.length>0&&this.options.processEntities)for(let W=0;W<this.options.entities.length;W++){let Q=this.options.entities[W];J=J.replace(Q.regex,Q.val)}return J};function HW(J){return this.options.indentBy.repeat(J)}function $W(J){if(J.startsWith(this.options.attributeNamePrefix)&&J!==this.options.textNodeName)return J.substr(this.attrPrefixLen);else return!1}var b0=z5;var D8={validate:M8};/*! pako 2.2.0 https://github.com/nodeca/pako @license (MIT AND Zlib) */function R6(J){let W=J.length;while(--W>=0)J[W]=0}var qW=0,e7=1,VW=2,LW=3,BW=258,YJ=29,z8=256,t6=z8+1+YJ,P6=30,GJ=19,J9=2*t6+1,s5=15,f0=16,jW=7,zJ=256,Q9=16,W9=17,Y9=18,r0=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),f8=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),MW=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),G9=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),PW=512,f5=Array((t6+2)*2);R6(f5);var o6=Array(P6*2);R6(o6);var e6=Array(PW);R6(e6);var J8=Array(BW-LW+1);R6(J8);var UJ=Array(YJ);R6(UJ);var v8=Array(P6);R6(v8);function v0(J,W,Q,G,z){this.static_tree=J,this.extra_bits=W,this.extra_base=Q,this.elems=G,this.max_length=z,this.has_stree=J&&J.length}var z9,U9,Z9;function _0(J,W){this.dyn_tree=J,this.max_code=0,this.stat_desc=W}var K9=(J)=>{return J<256?e6[J]:e6[256+(J>>>7)]},Q8=(J,W)=>{J.pending_buf[J.pending++]=W&255,J.pending_buf[J.pending++]=W>>>8&255},U5=(J,W,Q)=>{if(J.bi_valid>f0-Q)J.bi_buf|=W<<J.bi_valid&65535,Q8(J,J.bi_buf),J.bi_buf=W>>f0-J.bi_valid,J.bi_valid+=Q-f0;else J.bi_buf|=W<<J.bi_valid&65535,J.bi_valid+=Q},w5=(J,W,Q)=>{U5(J,Q[W*2],Q[W*2+1])},X9=(J,W)=>{let Q=0;do Q|=J&1,J>>>=1,Q<<=1;while(--W>0);return Q>>>1},OW=(J)=>{if(J.bi_valid===16)Q8(J,J.bi_buf),J.bi_buf=0,J.bi_valid=0;else if(J.bi_valid>=8)J.pending_buf[J.pending++]=J.bi_buf&255,J.bi_buf>>=8,J.bi_valid-=8},CW=(J,W)=>{let{dyn_tree:Q,max_code:G}=W,z=W.stat_desc.static_tree,Y=W.stat_desc.has_stree,Z=W.stat_desc.extra_bits,K=W.stat_desc.extra_base,$=W.stat_desc.max_length,U,X,H,F,q,L,V=0;for(F=0;F<=s5;F++)J.bl_count[F]=0;Q[J.heap[J.heap_max]*2+1]=0;for(U=J.heap_max+1;U<J9;U++){if(X=J.heap[U],F=Q[Q[X*2+1]*2+1]+1,F>$)F=$,V++;if(Q[X*2+1]=F,X>G)continue;if(J.bl_count[F]++,q=0,X>=K)q=Z[X-K];if(L=Q[X*2],J.opt_len+=L*(F+q),Y)J.static_len+=L*(z[X*2+1]+q)}if(V===0)return;do{F=$-1;while(J.bl_count[F]===0)F--;J.bl_count[F]--,J.bl_count[F+1]+=2,J.bl_count[$]--,V-=2}while(V>0);for(F=$;F!==0;F--){X=J.bl_count[F];while(X!==0){if(H=J.heap[--U],H>G)continue;if(Q[H*2+1]!==F)J.opt_len+=(F-Q[H*2+1])*Q[H*2],Q[H*2+1]=F;X--}}},F9=(J,W,Q)=>{let G=Array(s5+1),z=0,Y,Z;for(Y=1;Y<=s5;Y++)z=z+Q[Y-1]<<1,G[Y]=z;for(Z=0;Z<=W;Z++){let K=J[Z*2+1];if(K===0)continue;J[Z*2]=X9(G[K]++,K)}},AW=()=>{let J,W,Q,G,z,Y=Array(s5+1);Q=0;for(G=0;G<YJ-1;G++){UJ[G]=Q;for(J=0;J<1<<r0[G];J++)J8[Q++]=G}J8[Q-1]=G,z=0;for(G=0;G<16;G++){v8[G]=z;for(J=0;J<1<<f8[G];J++)e6[z++]=G}z>>=7;for(;G<P6;G++){v8[G]=z<<7;for(J=0;J<1<<f8[G]-7;J++)e6[256+z++]=G}for(W=0;W<=s5;W++)Y[W]=0;J=0;while(J<=143)f5[J*2+1]=8,J++,Y[8]++;while(J<=255)f5[J*2+1]=9,J++,Y[9]++;while(J<=279)f5[J*2+1]=7,J++,Y[7]++;while(J<=287)f5[J*2+1]=8,J++,Y[8]++;F9(f5,t6+1,Y);for(J=0;J<P6;J++)o6[J*2+1]=5,o6[J*2]=X9(J,5);z9=new v0(f5,r0,z8+1,t6,s5),U9=new v0(o6,f8,0,P6,s5),Z9=new v0([],MW,0,GJ,jW)},H9=(J)=>{let W;for(W=0;W<t6;W++)J.dyn_ltree[W*2]=0;for(W=0;W<P6;W++)J.dyn_dtree[W*2]=0;for(W=0;W<GJ;W++)J.bl_tree[W*2]=0;J.dyn_ltree[zJ*2]=1,J.opt_len=J.static_len=0,J.sym_next=J.matches=0},$9=(J)=>{if(J.bi_valid>8)Q8(J,J.bi_buf);else if(J.bi_valid>0)J.pending_buf[J.pending++]=J.bi_buf;J.bi_buf=0,J.bi_valid=0},q7=(J,W,Q,G)=>{let z=W*2,Y=Q*2;return J[z]<J[Y]||J[z]===J[Y]&&G[W]<=G[Q]},x0=(J,W,Q)=>{let G=J.heap[Q],z=Q<<1;while(z<=J.heap_len){if(z<J.heap_len&&q7(W,J.heap[z+1],J.heap[z],J.depth))z++;if(q7(W,G,J.heap[z],J.depth))break;J.heap[Q]=J.heap[z],Q=z,z<<=1}J.heap[Q]=G},V7=(J,W,Q)=>{let G,z,Y=0,Z,K;if(J.sym_next!==0)do if(G=J.pending_buf[J.sym_buf+Y++]&255,G+=(J.pending_buf[J.sym_buf+Y++]&255)<<8,z=J.pending_buf[J.sym_buf+Y++],G===0)w5(J,z,W);else{if(Z=J8[z],w5(J,Z+z8+1,W),K=r0[Z],K!==0)z-=UJ[Z],U5(J,z,K);if(G--,Z=K9(G),w5(J,Z,Q),K=f8[Z],K!==0)G-=v8[Z],U5(J,G,K)}while(Y<J.sym_next);w5(J,zJ,W)},o0=(J,W)=>{let Q=W.dyn_tree,G=W.stat_desc.static_tree,z=W.stat_desc.has_stree,Y=W.stat_desc.elems,Z,K,$=-1,U;J.heap_len=0,J.heap_max=J9;for(Z=0;Z<Y;Z++)if(Q[Z*2]!==0)J.heap[++J.heap_len]=$=Z,J.depth[Z]=0;else Q[Z*2+1]=0;while(J.heap_len<2)if(U=J.heap[++J.heap_len]=$<2?++$:0,Q[U*2]=1,J.depth[U]=0,J.opt_len--,z)J.static_len-=G[U*2+1];W.max_code=$;for(Z=J.heap_len>>1;Z>=1;Z--)x0(J,Q,Z);U=Y;do Z=J.heap[1],J.heap[1]=J.heap[J.heap_len--],x0(J,Q,1),K=J.heap[1],J.heap[--J.heap_max]=Z,J.heap[--J.heap_max]=K,Q[U*2]=Q[Z*2]+Q[K*2],J.depth[U]=(J.depth[Z]>=J.depth[K]?J.depth[Z]:J.depth[K])+1,Q[Z*2+1]=Q[K*2+1]=U,J.heap[1]=U++,x0(J,Q,1);while(J.heap_len>=2);J.heap[--J.heap_max]=J.heap[1],CW(J,W),F9(Q,$,J.bl_count)},L7=(J,W,Q)=>{let G,z=-1,Y,Z=W[1],K=0,$=7,U=4;if(Z===0)$=138,U=3;W[(Q+1)*2+1]=65535;for(G=0;G<=Q;G++){if(Y=Z,Z=W[(G+1)*2+1],++K<$&&Y===Z)continue;else if(K<U)J.bl_tree[Y*2]+=K;else if(Y!==0){if(Y!==z)J.bl_tree[Y*2]++;J.bl_tree[Q9*2]++}else if(K<=10)J.bl_tree[W9*2]++;else J.bl_tree[Y9*2]++;if(K=0,z=Y,Z===0)$=138,U=3;else if(Y===Z)$=6,U=3;else $=7,U=4}},B7=(J,W,Q)=>{let G,z=-1,Y,Z=W[1],K=0,$=7,U=4;if(Z===0)$=138,U=3;for(G=0;G<=Q;G++){if(Y=Z,Z=W[(G+1)*2+1],++K<$&&Y===Z)continue;else if(K<U)do w5(J,Y,J.bl_tree);while(--K!==0);else if(Y!==0){if(Y!==z)w5(J,Y,J.bl_tree),K--;w5(J,Q9,J.bl_tree),U5(J,K-3,2)}else if(K<=10)w5(J,W9,J.bl_tree),U5(J,K-3,3);else w5(J,Y9,J.bl_tree),U5(J,K-11,7);if(K=0,z=Y,Z===0)$=138,U=3;else if(Y===Z)$=6,U=3;else $=7,U=4}},RW=(J)=>{let W;L7(J,J.dyn_ltree,J.l_desc.max_code),L7(J,J.dyn_dtree,J.d_desc.max_code),o0(J,J.bl_desc);for(W=GJ-1;W>=3;W--)if(J.bl_tree[G9[W]*2+1]!==0)break;return J.opt_len+=3*(W+1)+5+5+4,W},TW=(J,W,Q,G)=>{let z;U5(J,W-257,5),U5(J,Q-1,5),U5(J,G-4,4);for(z=0;z<G;z++)U5(J,J.bl_tree[G9[z]*2+1],3);B7(J,J.dyn_ltree,W-1),B7(J,J.dyn_dtree,Q-1)},EW=(J)=>{let W=4093624447,Q;for(Q=0;Q<=31;Q++,W>>>=1)if(W&1&&J.dyn_ltree[Q*2]!==0)return 0;if(J.dyn_ltree[18]!==0||J.dyn_ltree[20]!==0||J.dyn_ltree[26]!==0)return 1;for(Q=32;Q<z8;Q++)if(J.dyn_ltree[Q*2]!==0)return 1;return 0},j7=!1,wW=(J)=>{if(!j7)AW(),j7=!0;J.l_desc=new _0(J.dyn_ltree,z9),J.d_desc=new _0(J.dyn_dtree,U9),J.bl_desc=new _0(J.bl_tree,Z9),J.bi_buf=0,J.bi_valid=0,H9(J)},q9=(J,W,Q,G)=>{if(U5(J,(qW<<1)+(G?1:0),3),$9(J),Q8(J,Q),Q8(J,~Q),Q)J.pending_buf.set(J.window.subarray(W,W+Q),J.pending);J.pending+=Q},NW=(J)=>{U5(J,e7<<1,3),w5(J,zJ,f5),OW(J)},DW=(J,W,Q,G)=>{let z,Y,Z=0;if(J.level>0){if(J.strm.data_type===2)J.strm.data_type=EW(J);if(o0(J,J.l_desc),o0(J,J.d_desc),Z=RW(J),z=J.opt_len+3+7>>>3,Y=J.static_len+3+7>>>3,Y<=z)z=Y}else z=Y=Q+5;if(Q+4<=z&&W!==-1)q9(J,W,Q,G);else if(J.strategy===4||Y===z)U5(J,(e7<<1)+(G?1:0),3),V7(J,f5,o6);else U5(J,(VW<<1)+(G?1:0),3),TW(J,J.l_desc.max_code+1,J.d_desc.max_code+1,Z+1),V7(J,J.dyn_ltree,J.dyn_dtree);if(H9(J),G)$9(J)},kW=(J,W,Q)=>{if(J.pending_buf[J.sym_buf+J.sym_next++]=W,J.pending_buf[J.sym_buf+J.sym_next++]=W>>8,J.pending_buf[J.sym_buf+J.sym_next++]=Q,W===0)J.dyn_ltree[Q*2]++;else J.matches++,W--,J.dyn_ltree[(J8[Q]+z8+1)*2]++,J.dyn_dtree[K9(W)*2]++;return J.sym_next===J.sym_end},SW=wW,IW=q9,yW=DW,bW=kW,fW=NW,vW={_tr_init:SW,_tr_stored_block:IW,_tr_flush_block:yW,_tr_tally:bW,_tr_align:fW},_W=(J,W,Q,G)=>{let z=J&65535|0,Y=J>>>16&65535|0,Z=0;while(Q!==0){Z=Q>2000?2000:Q,Q-=Z;do z=z+W[G++]|0,Y=Y+z|0;while(--Z);z%=65521,Y%=65521}return z|Y<<16|0},W8=_W,xW=()=>{let J,W=[];for(var Q=0;Q<256;Q++){J=Q;for(var G=0;G<8;G++)J=J&1?3988292384^J>>>1:J>>>1;W[Q]=J}return W},hW=new Uint32Array(xW()),uW=(J,W,Q,G)=>{let z=hW,Y=G+Q;J^=-1;for(let Z=G;Z<Y;Z++)J=J>>>8^z[(J^W[Z])&255];return J^-1},o=uW,J6={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},G6={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8},{_tr_init:gW,_tr_stored_block:a0,_tr_flush_block:cW,_tr_tally:g5,_tr_align:mW}=vW,{Z_NO_FLUSH:c5,Z_PARTIAL_FLUSH:pW,Z_FULL_FLUSH:dW,Z_FINISH:j5,Z_BLOCK:M7,Z_OK:s,Z_STREAM_END:P7,Z_STREAM_ERROR:N5,Z_DATA_ERROR:lW,Z_BUF_ERROR:h0,Z_DEFAULT_COMPRESSION:iW,Z_FILTERED:nW,Z_HUFFMAN_ONLY:k8,Z_RLE:rW,Z_FIXED:oW,Z_DEFAULT_STRATEGY:aW,Z_UNKNOWN:sW,Z_DEFLATED:h8}=G6,tW=9,eW=15,J4=8,Q4=29,W4=256,s0=W4+1+Q4,Y4=30,G4=19,z4=2*s0+1,U4=15,_=3,u5=258,D5=u5+_+1,Z4=32,C6=42,ZJ=57,t0=69,e0=73,JJ=91,QJ=103,t5=113,n6=666,W5=1,T6=2,Q6=3,E6=4,K4=3,e5=(J,W)=>{return J.msg=J6[W],W},O7=(J)=>{return J*2-(J>4?9:0)},h5=(J)=>{let W=J.length;while(--W>=0)J[W]=0},X4=(J)=>{let W,Q,G,z=J.w_size;W=J.hash_size,G=W;do Q=J.head[--G],J.head[G]=Q>=z?Q-z:0;while(--W);W=z,G=W;do Q=J.prev[--G],J.prev[G]=Q>=z?Q-z:0;while(--W)},KJ=(J,W,Q)=>(W<<J.hash_shift^Q)&J.hash_mask,W6=(J,W)=>{let Q;if(J.legacy_hash)Q=J.ins_h=KJ(J,J.ins_h,J.window[W+_-1]);else{let z=J.window,Y=z[W]|z[W+1]<<8|z[W+2]<<16|z[W+3]<<24;Q=J.ins_h=Math.imul(Y,66521)+66521>>>16&J.hash_mask}let G=J.prev[W&J.w_mask]=J.head[Q];return J.head[Q]=W,G},H5=(J)=>{let W=J.state,Q=W.pending;if(Q>J.avail_out)Q=J.avail_out;if(Q===0)return;if(J.output.set(W.pending_buf.subarray(W.pending_out,W.pending_out+Q),J.next_out),J.next_out+=Q,W.pending_out+=Q,J.total_out+=Q,J.avail_out-=Q,W.pending-=Q,W.pending===0)W.pending_out=0},$5=(J,W)=>{cW(J,J.block_start>=0?J.block_start:-1,J.strstart-J.block_start,W),J.block_start=J.strstart,H5(J.strm)},x=(J,W)=>{J.pending_buf[J.pending++]=W},i6=(J,W)=>{J.pending_buf[J.pending++]=W>>>8&255,J.pending_buf[J.pending++]=W&255},WJ=(J,W,Q,G)=>{let z=J.avail_in;if(z>G)z=G;if(z===0)return 0;if(J.avail_in-=z,W.set(J.input.subarray(J.next_in,J.next_in+z),Q),J.state.wrap===1)J.adler=W8(J.adler,W,z,Q);else if(J.state.wrap===2)J.adler=o(J.adler,W,z,Q);return J.next_in+=z,J.total_in+=z,z},V9=(J,W)=>{let{max_chain_length:Q,strstart:G}=J,z,Y,Z=J.prev_length,K=J.nice_match,$=J.strstart>J.w_size-D5?J.strstart-(J.w_size-D5):0,U=J.window,X=J.w_mask,H=J.prev,F=J.strstart+u5,q=U[G+Z-1],L=U[G+Z];if(J.prev_length>=J.good_match)Q>>=2;if(K>J.lookahead)K=J.lookahead;do{if(z=W,U[z+Z]!==L||U[z+Z-1]!==q||U[z]!==U[G]||U[++z]!==U[G+1])continue;G+=2,z++;do;while(U[++G]===U[++z]&&U[++G]===U[++z]&&U[++G]===U[++z]&&U[++G]===U[++z]&&U[++G]===U[++z]&&U[++G]===U[++z]&&U[++G]===U[++z]&&U[++G]===U[++z]&&G<F);if(Y=u5-(F-G),G=F-u5,Y>Z){if(J.match_start=W,Z=Y,Y>=K)break;q=U[G+Z-1],L=U[G+Z]}}while((W=H[W&X])>$&&--Q!==0);if(Z<=J.lookahead)return Z;return J.lookahead},A6=(J)=>{let W=J.w_size,Q,G,z;do{if(G=J.window_size-J.lookahead-J.strstart,J.strstart>=W+(W-D5)){if(J.window.set(J.window.subarray(W,W+W-G),0),J.match_start-=W,J.strstart-=W,J.block_start-=W,J.insert>J.strstart)J.insert=J.strstart;X4(J),G+=W}if(J.strm.avail_in===0)break;if(Q=WJ(J.strm,J.window,J.strstart+J.lookahead,G),J.lookahead+=Q,!J.legacy_hash){if(J.lookahead+J.insert>_){z=J.strstart-J.insert;while(J.insert)if(W6(J,z),z++,J.insert--,J.lookahead+J.insert<=_)break}}else if(J.lookahead+J.insert>=_){z=J.strstart-J.insert,J.ins_h=J.window[z],J.ins_h=KJ(J,J.ins_h,J.window[z+1]);while(J.insert)if(W6(J,z),z++,J.insert--,J.lookahead+J.insert<_)break}}while(J.lookahead<D5&&J.strm.avail_in!==0)},L9=(J,W)=>{let Q=J.pending_buf_size-5>J.w_size?J.w_size:J.pending_buf_size-5,G,z,Y,Z=0,K=J.strm.avail_in;do{if(G=65535,Y=J.bi_valid+42>>3,J.strm.avail_out<Y)break;if(Y=J.strm.avail_out-Y,z=J.strstart-J.block_start,G>z+J.strm.avail_in)G=z+J.strm.avail_in;if(G>Y)G=Y;if(G<Q&&(G===0&&W!==j5||W===c5||G!==z+J.strm.avail_in))break;if(Z=W===j5&&G===z+J.strm.avail_in?1:0,a0(J,0,0,Z),J.pending_buf[J.pending-4]=G,J.pending_buf[J.pending-3]=G>>8,J.pending_buf[J.pending-2]=~G,J.pending_buf[J.pending-1]=~G>>8,H5(J.strm),z){if(z>G)z=G;J.strm.output.set(J.window.subarray(J.block_start,J.block_start+z),J.strm.next_out),J.strm.next_out+=z,J.strm.avail_out-=z,J.strm.total_out+=z,J.block_start+=z,G-=z}if(G)WJ(J.strm,J.strm.output,J.strm.next_out,G),J.strm.next_out+=G,J.strm.avail_out-=G,J.strm.total_out+=G}while(Z===0);if(K-=J.strm.avail_in,K){if(K>=J.w_size)J.matches=2,J.window.set(J.strm.input.subarray(J.strm.next_in-J.w_size,J.strm.next_in),0),J.strstart=J.w_size,J.insert=J.strstart;else{if(J.window_size-J.strstart<=K){if(J.strstart-=J.w_size,J.window.set(J.window.subarray(J.w_size,J.w_size+J.strstart),0),J.matches<2)J.matches++;if(J.insert>J.strstart)J.insert=J.strstart}J.window.set(J.strm.input.subarray(J.strm.next_in-K,J.strm.next_in),J.strstart),J.strstart+=K,J.insert+=K>J.w_size-J.insert?J.w_size-J.insert:K}J.block_start=J.strstart}if(J.high_water<J.strstart)J.high_water=J.strstart;if(Z)return E6;if(W!==c5&&W!==j5&&J.strm.avail_in===0&&J.strstart===J.block_start)return T6;if(Y=J.window_size-J.strstart,J.strm.avail_in>Y&&J.block_start>=J.w_size){if(J.block_start-=J.w_size,J.strstart-=J.w_size,J.window.set(J.window.subarray(J.w_size,J.w_size+J.strstart),0),J.matches<2)J.matches++;if(Y+=J.w_size,J.insert>J.strstart)J.insert=J.strstart}if(Y>J.strm.avail_in)Y=J.strm.avail_in;if(Y)WJ(J.strm,J.window,J.strstart,Y),J.strstart+=Y,J.insert+=Y>J.w_size-J.insert?J.w_size-J.insert:Y;if(J.high_water<J.strstart)J.high_water=J.strstart;if(Y=J.bi_valid+42>>3,Y=J.pending_buf_size-Y>65535?65535:J.pending_buf_size-Y,Q=Y>J.w_size?J.w_size:Y,z=J.strstart-J.block_start,z>=Q||(z||W===j5)&&W!==c5&&J.strm.avail_in===0&&z<=Y)G=z>Y?Y:z,Z=W===j5&&J.strm.avail_in===0&&G===z?1:0,a0(J,J.block_start,G,Z),J.block_start+=G,H5(J.strm);return Z?Q6:W5},u0=(J,W)=>{let Q,G;for(;;){if(J.lookahead<D5){if(A6(J),J.lookahead<D5&&W===c5)return W5;if(J.lookahead===0)break}if(Q=0,J.lookahead>=_)Q=W6(J,J.strstart);if(Q!==0&&J.strstart-Q<=J.w_size-D5)J.match_length=V9(J,Q);if(J.match_length>=_){if(G=g5(J,J.strstart-J.match_start,J.match_length-_),J.lookahead-=J.match_length,J.match_length<=J.max_lazy_match&&J.lookahead>=_){J.match_length--;do J.strstart++,Q=W6(J,J.strstart);while(--J.match_length!==0);J.strstart++}else if(J.strstart+=J.match_length,J.match_length=0,J.legacy_hash)J.ins_h=J.window[J.strstart],J.ins_h=KJ(J,J.ins_h,J.window[J.strstart+1])}else G=g5(J,0,J.window[J.strstart]),J.lookahead--,J.strstart++;if(G){if($5(J,!1),J.strm.avail_out===0)return W5}}if(J.insert=J.strstart<_-1?J.strstart:_-1,W===j5){if($5(J,!0),J.strm.avail_out===0)return Q6;return E6}if(J.sym_next){if($5(J,!1),J.strm.avail_out===0)return W5}return T6},j6=(J,W)=>{let Q,G,z;for(;;){if(J.lookahead<D5){if(A6(J),J.lookahead<D5&&W===c5)return W5;if(J.lookahead===0)break}if(Q=0,J.lookahead>=_)Q=W6(J,J.strstart);if(J.prev_length=J.match_length,J.prev_match=J.match_start,J.match_length=_-1,Q!==0&&J.prev_length<J.max_lazy_match&&J.strstart-Q<=J.w_size-D5){if(J.match_length=V9(J,Q),J.match_length<=5&&(J.strategy===nW||J.match_length===_&&J.strstart-J.match_start>4096))J.match_length=_-1}if(J.prev_length>=_&&J.match_length<=J.prev_length){z=J.strstart+J.lookahead-_,G=g5(J,J.strstart-1-J.prev_match,J.prev_length-_),J.lookahead-=J.prev_length-1,J.prev_length-=2;do if(++J.strstart<=z)Q=W6(J,J.strstart);while(--J.prev_length!==0);if(J.match_available=0,J.match_length=_-1,J.strstart++,G){if($5(J,!1),J.strm.avail_out===0)return W5}}else if(J.match_available){if(G=g5(J,0,J.window[J.strstart-1]),G)$5(J,!1);if(J.strstart++,J.lookahead--,J.strm.avail_out===0)return W5}else J.match_available=1,J.strstart++,J.lookahead--}if(J.match_available)G=g5(J,0,J.window[J.strstart-1]),J.match_available=0;if(J.insert=J.strstart<_-1?J.strstart:_-1,W===j5){if($5(J,!0),J.strm.avail_out===0)return Q6;return E6}if(J.sym_next){if($5(J,!1),J.strm.avail_out===0)return W5}return T6},F4=(J,W)=>{let Q,G,z,Y,Z=J.window;for(;;){if(J.lookahead<=u5){if(A6(J),J.lookahead<=u5&&W===c5)return W5;if(J.lookahead===0)break}if(J.match_length=0,J.lookahead>=_&&J.strstart>0){if(z=J.strstart-1,G=Z[z],G===Z[++z]&&G===Z[++z]&&G===Z[++z]){Y=J.strstart+u5;do;while(G===Z[++z]&&G===Z[++z]&&G===Z[++z]&&G===Z[++z]&&G===Z[++z]&&G===Z[++z]&&G===Z[++z]&&G===Z[++z]&&z<Y);if(J.match_length=u5-(Y-z),J.match_length>J.lookahead)J.match_length=J.lookahead}}if(J.match_length>=_)Q=g5(J,1,J.match_length-_),J.lookahead-=J.match_length,J.strstart+=J.match_length,J.match_length=0;else Q=g5(J,0,J.window[J.strstart]),J.lookahead--,J.strstart++;if(Q){if($5(J,!1),J.strm.avail_out===0)return W5}}if(J.insert=0,W===j5){if($5(J,!0),J.strm.avail_out===0)return Q6;return E6}if(J.sym_next){if($5(J,!1),J.strm.avail_out===0)return W5}return T6},H4=(J,W)=>{let Q;for(;;){if(J.lookahead===0){if(A6(J),J.lookahead===0){if(W===c5)return W5;break}}if(J.match_length=0,Q=g5(J,0,J.window[J.strstart]),J.lookahead--,J.strstart++,Q){if($5(J,!1),J.strm.avail_out===0)return W5}}if(J.insert=0,W===j5){if($5(J,!0),J.strm.avail_out===0)return Q6;return E6}if(J.sym_next){if($5(J,!1),J.strm.avail_out===0)return W5}return T6};function T5(J,W,Q,G,z){this.good_length=J,this.max_lazy=W,this.nice_length=Q,this.max_chain=G,this.func=z}var r6=[new T5(0,0,0,0,L9),new T5(4,4,8,4,u0),new T5(4,5,16,8,u0),new T5(4,6,32,32,u0),new T5(4,4,16,16,j6),new T5(8,16,32,32,j6),new T5(8,16,128,128,j6),new T5(8,32,128,256,j6),new T5(32,128,258,1024,j6),new T5(32,258,258,4096,j6)],$4=(J)=>{J.window_size=2*J.w_size,h5(J.head),J.max_lazy_match=r6[J.level].max_lazy,J.good_match=r6[J.level].good_length,J.nice_match=r6[J.level].nice_length,J.max_chain_length=r6[J.level].max_chain,J.strstart=0,J.block_start=0,J.lookahead=0,J.insert=0,J.match_length=J.prev_length=_-1,J.match_available=0,J.ins_h=0};function q4(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=h8,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.legacy_hash=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new Uint16Array(z4*2),this.dyn_dtree=new Uint16Array((2*Y4+1)*2),this.bl_tree=new Uint16Array((2*G4+1)*2),h5(this.dyn_ltree),h5(this.dyn_dtree),h5(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new Uint16Array(U4+1),this.heap=new Uint16Array(2*s0+1),h5(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new Uint16Array(2*s0+1),h5(this.depth),this.sym_buf=0,this.lit_bufsize=0,this.sym_next=0,this.sym_end=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}var U8=(J)=>{if(!J)return 1;let W=J.state;if(!W||W.strm!==J||W.status!==C6&&W.status!==ZJ&&W.status!==t0&&W.status!==e0&&W.status!==JJ&&W.status!==QJ&&W.status!==t5&&W.status!==n6)return 1;return 0},B9=(J)=>{if(U8(J))return e5(J,N5);J.total_in=J.total_out=0,J.data_type=sW;let W=J.state;if(W.pending=0,W.pending_out=0,W.wrap<0)W.wrap=-W.wrap;return W.status=W.wrap===2?ZJ:W.wrap?C6:t5,J.adler=W.wrap===2?0:1,W.last_flush=-2,gW(W),s},j9=(J)=>{let W=B9(J);if(W===s)$4(J.state);return W},V4=(J,W)=>{if(U8(J)||J.state.wrap!==2)return N5;return J.state.gzhead=W,s},M9=(J,W,Q,G,z,Y,Z)=>{if(!J)return N5;let K=1;if(W===iW)W=6;if(G<0)K=0,G=-G;else if(G>15)K=2,G-=16;if(z<1||z>tW||Q!==h8||G<8||G>15||W<0||W>9||Y<0||Y>oW||G===8&&K!==1)return e5(J,N5);if(G===8)G=9;let $=new q4;if(J.state=$,$.strm=J,$.status=C6,$.wrap=K,$.gzhead=null,$.w_bits=G,$.w_size=1<<$.w_bits,$.w_mask=$.w_size-1,$.legacy_hash=Z?1:0,$.hash_bits=z+7,!$.legacy_hash&&$.hash_bits<15)$.hash_bits=15;return $.hash_size=1<<$.hash_bits,$.hash_mask=$.hash_size-1,$.hash_shift=~~(($.hash_bits+_-1)/_),$.window=new Uint8Array($.w_size*2),$.head=new Uint16Array($.hash_size),$.prev=new Uint16Array($.w_size),$.lit_bufsize=1<<z+6,$.pending_buf_size=$.lit_bufsize*4,$.pending_buf=new Uint8Array($.pending_buf_size),$.sym_buf=$.lit_bufsize,$.sym_end=($.lit_bufsize-1)*3,$.level=W,$.strategy=Y,$.method=Q,j9(J)},L4=(J,W)=>{return M9(J,W,h8,eW,J4,aW)},B4=(J,W)=>{if(U8(J)||W>M7||W<0)return J?e5(J,N5):N5;let Q=J.state;if(!J.output||J.avail_in!==0&&!J.input||Q.status===n6&&W!==j5)return e5(J,J.avail_out===0?h0:N5);let G=Q.last_flush;if(Q.last_flush=W,Q.pending!==0){if(H5(J),J.avail_out===0)return Q.last_flush=-1,s}else if(J.avail_in===0&&O7(W)<=O7(G)&&W!==j5)return e5(J,h0);if(Q.status===n6&&J.avail_in!==0)return e5(J,h0);if(Q.status===C6&&Q.wrap===0)Q.status=t5;if(Q.status===C6){let z=h8+(Q.w_bits-8<<4)<<8,Y=-1;if(Q.strategy>=k8||Q.level<2)Y=0;else if(Q.level<6)Y=1;else if(Q.level===6)Y=2;else Y=3;if(z|=Y<<6,Q.strstart!==0)z|=Z4;if(z+=31-z%31,i6(Q,z),Q.strstart!==0)i6(Q,J.adler>>>16),i6(Q,J.adler&65535);if(J.adler=1,Q.status=t5,H5(J),Q.pending!==0)return Q.last_flush=-1,s}if(Q.status===ZJ)if(J.adler=0,x(Q,31),x(Q,139),x(Q,8),!Q.gzhead){if(x(Q,0),x(Q,0),x(Q,0),x(Q,0),x(Q,0),x(Q,Q.level===9?2:Q.strategy>=k8||Q.level<2?4:0),x(Q,K4),Q.status=t5,H5(J),Q.pending!==0)return Q.last_flush=-1,s}else{if(x(Q,(Q.gzhead.text?1:0)+(Q.gzhead.hcrc?2:0)+(!Q.gzhead.extra?0:4)+(!Q.gzhead.name?0:8)+(!Q.gzhead.comment?0:16)),x(Q,Q.gzhead.time&255),x(Q,Q.gzhead.time>>8&255),x(Q,Q.gzhead.time>>16&255),x(Q,Q.gzhead.time>>24&255),x(Q,Q.level===9?2:Q.strategy>=k8||Q.level<2?4:0),x(Q,Q.gzhead.os&255),Q.gzhead.extra&&Q.gzhead.extra.length)x(Q,Q.gzhead.extra.length&255),x(Q,Q.gzhead.extra.length>>8&255);if(Q.gzhead.hcrc)J.adler=o(J.adler,Q.pending_buf,Q.pending,0);Q.gzindex=0,Q.status=t0}if(Q.status===t0){if(Q.gzhead.extra){let z=Q.pending,Y=(Q.gzhead.extra.length&65535)-Q.gzindex;while(Q.pending+Y>Q.pending_buf_size){let K=Q.pending_buf_size-Q.pending;if(Q.pending_buf.set(Q.gzhead.extra.subarray(Q.gzindex,Q.gzindex+K),Q.pending),Q.pending=Q.pending_buf_size,Q.gzhead.hcrc&&Q.pending>z)J.adler=o(J.adler,Q.pending_buf,Q.pending-z,z);if(Q.gzindex+=K,H5(J),Q.pending!==0)return Q.last_flush=-1,s;z=0,Y-=K}let Z=new Uint8Array(Q.gzhead.extra);if(Q.pending_buf.set(Z.subarray(Q.gzindex,Q.gzindex+Y),Q.pending),Q.pending+=Y,Q.gzhead.hcrc&&Q.pending>z)J.adler=o(J.adler,Q.pending_buf,Q.pending-z,z);Q.gzindex=0}Q.status=e0}if(Q.status===e0){if(Q.gzhead.name){let z=Q.pending,Y;do{if(Q.pending===Q.pending_buf_size){if(Q.gzhead.hcrc&&Q.pending>z)J.adler=o(J.adler,Q.pending_buf,Q.pending-z,z);if(H5(J),Q.pending!==0)return Q.last_flush=-1,s;z=0}if(Q.gzindex<Q.gzhead.name.length)Y=Q.gzhead.name.charCodeAt(Q.gzindex++)&255;else Y=0;x(Q,Y)}while(Y!==0);if(Q.gzhead.hcrc&&Q.pending>z)J.adler=o(J.adler,Q.pending_buf,Q.pending-z,z);Q.gzindex=0}Q.status=JJ}if(Q.status===JJ){if(Q.gzhead.comment){let z=Q.pending,Y;do{if(Q.pending===Q.pending_buf_size){if(Q.gzhead.hcrc&&Q.pending>z)J.adler=o(J.adler,Q.pending_buf,Q.pending-z,z);if(H5(J),Q.pending!==0)return Q.last_flush=-1,s;z=0}if(Q.gzindex<Q.gzhead.comment.length)Y=Q.gzhead.comment.charCodeAt(Q.gzindex++)&255;else Y=0;x(Q,Y)}while(Y!==0);if(Q.gzhead.hcrc&&Q.pending>z)J.adler=o(J.adler,Q.pending_buf,Q.pending-z,z)}Q.status=QJ}if(Q.status===QJ){if(Q.gzhead.hcrc){if(Q.pending+2>Q.pending_buf_size){if(H5(J),Q.pending!==0)return Q.last_flush=-1,s}x(Q,J.adler&255),x(Q,J.adler>>8&255),J.adler=0}if(Q.status=t5,H5(J),Q.pending!==0)return Q.last_flush=-1,s}if(J.avail_in!==0||Q.lookahead!==0||W!==c5&&Q.status!==n6){let z=Q.level===0?L9(Q,W):Q.strategy===k8?H4(Q,W):Q.strategy===rW?F4(Q,W):r6[Q.level].func(Q,W);if(z===Q6||z===E6)Q.status=n6;if(z===W5||z===Q6){if(J.avail_out===0)Q.last_flush=-1;return s}if(z===T6){if(W===pW)mW(Q);else if(W!==M7){if(a0(Q,0,0,!1),W===dW){if(h5(Q.head),Q.lookahead===0)Q.strstart=0,Q.block_start=0,Q.insert=0}}if(H5(J),J.avail_out===0)return Q.last_flush=-1,s}}if(W!==j5)return s;if(Q.wrap<=0)return P7;if(Q.wrap===2)x(Q,J.adler&255),x(Q,J.adler>>8&255),x(Q,J.adler>>16&255),x(Q,J.adler>>24&255),x(Q,J.total_in&255),x(Q,J.total_in>>8&255),x(Q,J.total_in>>16&255),x(Q,J.total_in>>24&255);else i6(Q,J.adler>>>16),i6(Q,J.adler&65535);if(H5(J),Q.wrap>0)Q.wrap=-Q.wrap;return Q.pending!==0?s:P7},j4=(J)=>{if(U8(J))return N5;let W=J.state.status;return J.state=null,W===t5?e5(J,lW):s},M4=(J,W)=>{let Q=W.length;if(U8(J))return N5;let G=J.state,z=G.wrap;if(z===2||z===1&&G.status!==C6||G.lookahead)return N5;if(z===1)J.adler=W8(J.adler,W,Q,0);if(G.wrap=0,Q>=G.w_size){if(z===0)h5(G.head),G.strstart=0,G.block_start=0,G.insert=0;let $=new Uint8Array(G.w_size);$.set(W.subarray(Q-G.w_size,Q),0),W=$,Q=G.w_size}let{avail_in:Y,next_in:Z,input:K}=J;J.avail_in=Q,J.next_in=0,J.input=W,A6(G);while(G.lookahead>=_){let $=G.strstart,U=G.lookahead-(_-1);do W6(G,$),$++;while(--U);G.strstart=$,G.lookahead=_-1,A6(G)}return G.strstart+=G.lookahead,G.block_start=G.strstart,G.insert=G.lookahead,G.lookahead=0,G.match_length=G.prev_length=_-1,G.match_available=0,J.next_in=Z,J.input=K,J.avail_in=Y,G.wrap=z,s},P4=L4,O4=M9,C4=j9,A4=B9,R4=V4,T4=B4,E4=j4,w4=M4,N4="pako deflate (from Nodeca project)",a6={deflateInit:P4,deflateInit2:O4,deflateReset:C4,deflateResetKeep:A4,deflateSetHeader:R4,deflate:T4,deflateEnd:E4,deflateSetDictionary:w4,deflateInfo:N4},D4=(J,W)=>{return Object.prototype.hasOwnProperty.call(J,W)},k4=function(J){let W=Array.prototype.slice.call(arguments,1);while(W.length){let Q=W.shift();if(!Q)continue;if(typeof Q!=="object")throw TypeError(Q+"must be non-object");for(let G in Q)if(D4(Q,G))J[G]=Q[G]}return J},S4=(J)=>{let W=0;for(let G=0,z=J.length;G<z;G++)W+=J[G].length;let Q=new Uint8Array(W);for(let G=0,z=0,Y=J.length;G<Y;G++){let Z=J[G];Q.set(Z,z),z+=Z.length}return Q},u8={assign:k4,flattenChunks:S4},P9=!0;try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(J){P9=!1}var Y8=new Uint8Array(256);for(let J=0;J<256;J++)Y8[J]=J>=252?6:J>=248?5:J>=240?4:J>=224?3:J>=192?2:1;Y8[254]=Y8[255]=1;var I4=(J)=>{if(typeof TextEncoder==="function"&&TextEncoder.prototype.encode)return new TextEncoder().encode(J);let W,Q,G,z,Y,Z=J.length,K=0;for(z=0;z<Z;z++){if(Q=J.charCodeAt(z),(Q&64512)===55296&&z+1<Z){if(G=J.charCodeAt(z+1),(G&64512)===56320)Q=65536+(Q-55296<<10)+(G-56320),z++}K+=Q<128?1:Q<2048?2:Q<65536?3:4}W=new Uint8Array(K);for(Y=0,z=0;Y<K;z++){if(Q=J.charCodeAt(z),(Q&64512)===55296&&z+1<Z){if(G=J.charCodeAt(z+1),(G&64512)===56320)Q=65536+(Q-55296<<10)+(G-56320),z++}if(Q<128)W[Y++]=Q;else if(Q<2048)W[Y++]=192|Q>>>6,W[Y++]=128|Q&63;else if(Q<65536)W[Y++]=224|Q>>>12,W[Y++]=128|Q>>>6&63,W[Y++]=128|Q&63;else W[Y++]=240|Q>>>18,W[Y++]=128|Q>>>12&63,W[Y++]=128|Q>>>6&63,W[Y++]=128|Q&63}return W},y4=(J,W)=>{if(W<65534){if(J.subarray&&P9)return String.fromCharCode.apply(null,J.length===W?J:J.subarray(0,W))}let Q="";for(let G=0;G<W;G++)Q+=String.fromCharCode(J[G]);return Q},b4=(J,W)=>{let Q=W||J.length;if(typeof TextDecoder==="function"&&TextDecoder.prototype.decode)return new TextDecoder().decode(J.subarray(0,W));let G,z,Y=Array(Q*2);for(z=0,G=0;G<Q;){let Z=J[G++];if(Z<128){Y[z++]=Z;continue}let K=Y8[Z];if(K>4){Y[z++]=65533,G+=K-1;continue}Z&=K===2?31:K===3?15:7;while(K>1&&G<Q)Z=Z<<6|J[G++]&63,K--;if(K>1){Y[z++]=65533;continue}if(Z<65536)Y[z++]=Z;else Z-=65536,Y[z++]=55296|Z>>10&1023,Y[z++]=56320|Z&1023}return y4(Y,z)},f4=(J,W)=>{if(W=W||J.length,W>J.length)W=J.length;let Q=W-1;while(Q>=0&&(J[Q]&192)===128)Q--;if(Q<0)return W;if(Q===0)return W;return Q+Y8[J[Q]]>W?Q:W},G8={string2buf:I4,buf2string:b4,utf8border:f4};function v4(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}var O9=v4,C9=Object.prototype.toString,{Z_NO_FLUSH:_4,Z_SYNC_FLUSH:x4,Z_FULL_FLUSH:h4,Z_FINISH:u4,Z_OK:_8,Z_STREAM_END:g4,Z_DEFAULT_COMPRESSION:c4,Z_DEFAULT_STRATEGY:m4,Z_DEFLATED:p4}=G6,d4={level:c4,method:p4,chunkSize:16384,windowBits:15,memLevel:8,strategy:m4,legacyHash:!0};function Z8(J){this.options=u8.assign({},d4,J||{});let W=this.options;if(W.raw&&W.windowBits>0)W.windowBits=-W.windowBits;else if(W.gzip&&W.windowBits>0&&W.windowBits<16)W.windowBits+=16;this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new O9,this.strm.avail_out=0;let Q=a6.deflateInit2(this.strm,W.level,W.method,W.windowBits,W.memLevel,W.strategy,W.legacyHash);if(Q!==_8)throw Error(J6[Q]);if(W.header)a6.deflateSetHeader(this.strm,W.header);if(W.dictionary){let G;if(typeof W.dictionary==="string")G=G8.string2buf(W.dictionary);else if(C9.call(W.dictionary)==="[object ArrayBuffer]")G=new Uint8Array(W.dictionary);else G=W.dictionary;if(Q=a6.deflateSetDictionary(this.strm,G),Q!==_8)throw Error(J6[Q]);this._dict_set=!0}}Z8.prototype.push=function(J,W){let Q=this.strm,G=this.options.chunkSize,z,Y;if(this.ended)return!1;if(W===~~W)Y=W;else Y=W===!0?u4:_4;if(typeof J==="string")Q.input=G8.string2buf(J);else if(C9.call(J)==="[object ArrayBuffer]")Q.input=new Uint8Array(J);else Q.input=J;Q.next_in=0,Q.avail_in=Q.input.length;for(;;){if(Q.avail_out===0)Q.output=new Uint8Array(G),Q.next_out=0,Q.avail_out=G;if((Y===x4||Y===h4)&&Q.avail_out<=6){this.onData(Q.output.subarray(0,Q.next_out)),Q.avail_out=0;continue}if(z=a6.deflate(Q,Y),z===g4){if(Q.next_out>0)this.onData(Q.output.subarray(0,Q.next_out));return z=a6.deflateEnd(this.strm),this.onEnd(z),this.ended=!0,z===_8}if(Q.avail_out===0){this.onData(Q.output);continue}if(Y>0&&Q.next_out>0){this.onData(Q.output.subarray(0,Q.next_out)),Q.avail_out=0;continue}if(Q.avail_in===0)break}return!0};Z8.prototype.onData=function(J){this.chunks.push(J)};Z8.prototype.onEnd=function(J){if(J===_8)this.result=u8.flattenChunks(this.chunks);this.chunks=[],this.err=J,this.msg=this.strm.msg};function XJ(J,W){let Q=new Z8(W);if(Q.push(J,!0),Q.err)throw Q.msg||J6[Q.err];return Q.result}function l4(J,W){return W=W||{},W.raw=!0,XJ(J,W)}function i4(J,W){return W=W||{},W.gzip=!0,XJ(J,W)}var n4=Z8,r4=XJ,o4=l4,a4=i4,s4=G6,t4={Deflate:n4,deflate:r4,deflateRaw:o4,gzip:a4,constants:s4},S8=16209,e4=16191,JY=function(W,Q){let G,z,Y,Z,K,$,U,X,H,F,q,L,V,B,P,j,O,M,R,E,A,N,D,C,T=W.state;G=W.next_in,D=W.input,z=G+(W.avail_in-5),Y=W.next_out,C=W.output,Z=Y-(Q-W.avail_out),K=Y+(W.avail_out-257),$=T.dmax,U=T.wsize,X=T.whave,H=T.wnext,F=T.window,q=T.hold,L=T.bits,V=T.lencode,B=T.distcode,P=(1<<T.lenbits)-1,j=(1<<T.distbits)-1;J:do{if(L<15)q+=D[G++]<<L,L+=8,q+=D[G++]<<L,L+=8;O=V[q&P];Q:for(;;){if(M=O>>>24,q>>>=M,L-=M,M=O>>>16&255,M===0)C[Y++]=O&65535;else if(M&16){if(R=O&65535,M&=15,M){if(L<M)q+=D[G++]<<L,L+=8;R+=q&(1<<M)-1,q>>>=M,L-=M}if(L<15)q+=D[G++]<<L,L+=8,q+=D[G++]<<L,L+=8;O=B[q&j];W:for(;;){if(M=O>>>24,q>>>=M,L-=M,M=O>>>16&255,M&16){if(E=O&65535,M&=15,L<M){if(q+=D[G++]<<L,L+=8,L<M)q+=D[G++]<<L,L+=8}if(E+=q&(1<<M)-1,E>$){W.msg="invalid distance too far back",T.mode=S8;break J}if(q>>>=M,L-=M,M=Y-Z,E>M){if(M=E-M,M>X){if(T.sane){W.msg="invalid distance too far back",T.mode=S8;break J}}if(A=0,N=F,H===0){if(A+=U-M,M<R){R-=M;do C[Y++]=F[A++];while(--M);A=Y-E,N=C}}else if(H<M){if(A+=U+H-M,M-=H,M<R){R-=M;do C[Y++]=F[A++];while(--M);if(A=0,H<R){M=H,R-=M;do C[Y++]=F[A++];while(--M);A=Y-E,N=C}}}else if(A+=H-M,M<R){R-=M;do C[Y++]=F[A++];while(--M);A=Y-E,N=C}while(R>2)C[Y++]=N[A++],C[Y++]=N[A++],C[Y++]=N[A++],R-=3;if(R){if(C[Y++]=N[A++],R>1)C[Y++]=N[A++]}}else{A=Y-E;do C[Y++]=C[A++],C[Y++]=C[A++],C[Y++]=C[A++],R-=3;while(R>2);if(R){if(C[Y++]=C[A++],R>1)C[Y++]=C[A++]}}}else if((M&64)===0){O=B[(O&65535)+(q&(1<<M)-1)];continue W}else{W.msg="invalid distance code",T.mode=S8;break J}break}}else if((M&64)===0){O=V[(O&65535)+(q&(1<<M)-1)];continue Q}else if(M&32){T.mode=e4;break J}else{W.msg="invalid literal/length code",T.mode=S8;break J}break}}while(G<z&&Y<K);R=L>>3,G-=R,L-=R<<3,q&=(1<<L)-1,W.next_in=G,W.next_out=Y,W.avail_in=G<z?5+(z-G):5-(G-z),W.avail_out=Y<K?257+(K-Y):257-(Y-K),T.hold=q,T.bits=L;return},M6=15,C7=852,A7=592,R7=0,g0=1,T7=2,QY=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),WY=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,199,75]),YY=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),GY=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]),zY=(J,W,Q,G,z,Y,Z,K)=>{let $=K.bits,U=0,X=0,H=0,F=0,q=0,L=0,V=0,B=0,P=0,j=0,O,M,R,E,A,N=null,D,C=new Uint16Array(M6+1),T=new Uint16Array(M6+1),v=null,i,y,n;for(U=0;U<=M6;U++)C[U]=0;for(X=0;X<G;X++)C[W[Q+X]]++;q=$;for(F=M6;F>=1;F--)if(C[F]!==0)break;if(q>F)q=F;if(F===0)return z[Y++]=20971520,z[Y++]=20971520,K.bits=1,0;for(H=1;H<F;H++)if(C[H]!==0)break;if(q<H)q=H;B=1;for(U=1;U<=M6;U++)if(B<<=1,B-=C[U],B<0)return-1;if(B>0&&(J===R7||F!==1))return-1;T[1]=0;for(U=1;U<M6;U++)T[U+1]=T[U]+C[U];for(X=0;X<G;X++)if(W[Q+X]!==0)Z[T[W[Q+X]]++]=X;if(J===R7)N=v=Z,D=20;else if(J===g0)N=QY,v=WY,D=257;else N=YY,v=GY,D=0;if(j=0,X=0,U=H,A=Y,L=q,V=0,R=-1,P=1<<q,E=P-1,J===g0&&P>C7||J===T7&&P>A7)return 1;for(;;){if(i=U-V,Z[X]+1<D)y=0,n=Z[X];else if(Z[X]>=D)y=v[Z[X]-D],n=N[Z[X]-D];else y=96,n=0;O=1<<U-V,M=1<<L,H=M;do M-=O,z[A+(j>>V)+M]=i<<24|y<<16|n|0;while(M!==0);O=1<<U-1;while(j&O)O>>=1;if(O!==0)j&=O-1,j+=O;else j=0;if(X++,--C[U]===0){if(U===F)break;U=W[Q+Z[X]]}if(U>q&&(j&E)!==R){if(V===0)V=q;A+=H,L=U-V,B=1<<L;while(L+V<F){if(B-=C[L+V],B<=0)break;L++,B<<=1}if(P+=1<<L,J===g0&&P>C7||J===T7&&P>A7)return 1;R=j&E,z[R]=q<<24|L<<16|A-Y|0}}if(j!==0)z[A+j]=U-V<<24|4194304|0;return K.bits=q,0},s6=zY,UY=0,A9=1,R9=2,{Z_FINISH:E7,Z_BLOCK:ZY,Z_TREES:I8,Z_OK:Y6,Z_STREAM_END:KY,Z_NEED_DICT:XY,Z_STREAM_ERROR:M5,Z_DATA_ERROR:T9,Z_MEM_ERROR:E9,Z_BUF_ERROR:FY,Z_DEFLATED:w7}=G6,g8=16180,N7=16181,D7=16182,k7=16183,S7=16184,I7=16185,y7=16186,b7=16187,f7=16188,v7=16189,x8=16190,b5=16191,c0=16192,_7=16193,m0=16194,x7=16195,h7=16196,u7=16197,g7=16198,y8=16199,b8=16200,c7=16201,m7=16202,p7=16203,d7=16204,l7=16205,p0=16206,i7=16207,n7=16208,m=16209,w9=16210,N9=16211,HY=852,$Y=592,qY=15,VY=qY,r7=(J)=>{return(J>>>24&255)+(J>>>8&65280)+((J&65280)<<8)+((J&255)<<24)};function LY(){this.strm=null,this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new Uint16Array(320),this.work=new Uint16Array(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}var z6=(J)=>{if(!J)return 1;let W=J.state;if(!W||W.strm!==J||W.mode<g8||W.mode>N9)return 1;return 0},D9=(J)=>{if(z6(J))return M5;let W=J.state;if(J.total_in=J.total_out=W.total=0,J.msg="",W.wrap)J.adler=W.wrap&1;return W.mode=g8,W.last=0,W.havedict=0,W.flags=-1,W.dmax=32768,W.head=null,W.hold=0,W.bits=0,W.lencode=W.lendyn=new Int32Array(HY),W.distcode=W.distdyn=new Int32Array($Y),W.sane=1,W.back=-1,Y6},k9=(J)=>{if(z6(J))return M5;let W=J.state;return W.wsize=0,W.whave=0,W.wnext=0,D9(J)},S9=(J,W)=>{let Q;if(z6(J))return M5;let G=J.state;if(W<0)Q=0,W=-W;else if(Q=(W>>4)+5,W<48)W&=15;if(W&&(W<8||W>15))return M5;if(G.window!==null&&G.wbits!==W)G.window=null;return G.wrap=Q,G.wbits=W,k9(J)},I9=(J,W)=>{if(!J)return M5;let Q=new LY;J.state=Q,Q.strm=J,Q.window=null,Q.mode=g8;let G=S9(J,W);if(G!==Y6)J.state=null;return G},BY=(J)=>{return I9(J,VY)},o7=!0,d0,l0,jY=(J)=>{if(o7){d0=new Int32Array(512),l0=new Int32Array(32);let W=0;while(W<144)J.lens[W++]=8;while(W<256)J.lens[W++]=9;while(W<280)J.lens[W++]=7;while(W<288)J.lens[W++]=8;s6(A9,J.lens,0,288,d0,0,J.work,{bits:9}),W=0;while(W<32)J.lens[W++]=5;s6(R9,J.lens,0,32,l0,0,J.work,{bits:5}),o7=!1}J.lencode=d0,J.lenbits=9,J.distcode=l0,J.distbits=5},y9=(J,W,Q,G)=>{let z,Y=J.state;if(Y.window===null)Y.window=new Uint8Array(1<<Y.wbits);if(Y.wsize===0)Y.wsize=1<<Y.wbits,Y.wnext=0,Y.whave=0;if(G>=Y.wsize)Y.window.set(W.subarray(Q-Y.wsize,Q),0),Y.wnext=0,Y.whave=Y.wsize;else{if(z=Y.wsize-Y.wnext,z>G)z=G;if(Y.window.set(W.subarray(Q-G,Q-G+z),Y.wnext),G-=z,G)Y.window.set(W.subarray(Q-G,Q),0),Y.wnext=G,Y.whave=Y.wsize;else{if(Y.wnext+=z,Y.wnext===Y.wsize)Y.wnext=0;if(Y.whave<Y.wsize)Y.whave+=z}}return 0},MY=(J,W)=>{let Q,G,z,Y,Z,K,$,U,X,H,F,q,L,V,B=0,P,j,O,M,R,E,A,N,D=new Uint8Array(4),C,T,v=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);if(z6(J)||!J.output||!J.input&&J.avail_in!==0)return M5;if(Q=J.state,Q.mode===b5)Q.mode=c0;Z=J.next_out,z=J.output,$=J.avail_out,Y=J.next_in,G=J.input,K=J.avail_in,U=Q.hold,X=Q.bits,H=K,F=$,N=Y6;J:for(;;)switch(Q.mode){case g8:if(Q.wrap===0){Q.mode=c0;break}while(X<16){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if(Q.wrap&2&&U===35615){if(Q.wbits===0)Q.wbits=15;Q.check=0,D[0]=U&255,D[1]=U>>>8&255,Q.check=o(Q.check,D,2,0),U=0,X=0,Q.mode=N7;break}if(Q.head)Q.head.done=!1;if(!(Q.wrap&1)||(((U&255)<<8)+(U>>8))%31){J.msg="incorrect header check",Q.mode=m;break}if((U&15)!==w7){J.msg="unknown compression method",Q.mode=m;break}if(U>>>=4,X-=4,A=(U&15)+8,Q.wbits===0)Q.wbits=A;if(A>15||A>Q.wbits){J.msg="invalid window size",Q.mode=m;break}Q.dmax=1<<Q.wbits,Q.flags=0,J.adler=Q.check=1,Q.mode=U&512?v7:b5,U=0,X=0;break;case N7:while(X<16){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if(Q.flags=U,(Q.flags&255)!==w7){J.msg="unknown compression method",Q.mode=m;break}if(Q.flags&57344){J.msg="unknown header flags set",Q.mode=m;break}if(Q.head)Q.head.text=U>>8&1;if(Q.flags&512&&Q.wrap&4)D[0]=U&255,D[1]=U>>>8&255,Q.check=o(Q.check,D,2,0);U=0,X=0,Q.mode=D7;case D7:while(X<32){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if(Q.head)Q.head.time=U;if(Q.flags&512&&Q.wrap&4)D[0]=U&255,D[1]=U>>>8&255,D[2]=U>>>16&255,D[3]=U>>>24&255,Q.check=o(Q.check,D,4,0);U=0,X=0,Q.mode=k7;case k7:while(X<16){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if(Q.head)Q.head.xflags=U&255,Q.head.os=U>>8;if(Q.flags&512&&Q.wrap&4)D[0]=U&255,D[1]=U>>>8&255,Q.check=o(Q.check,D,2,0);U=0,X=0,Q.mode=S7;case S7:if(Q.flags&1024){while(X<16){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if(Q.length=U,Q.head)Q.head.extra_len=U;if(Q.flags&512&&Q.wrap&4)D[0]=U&255,D[1]=U>>>8&255,Q.check=o(Q.check,D,2,0);U=0,X=0}else if(Q.head)Q.head.extra=null;Q.mode=I7;case I7:if(Q.flags&1024){if(q=Q.length,q>K)q=K;if(q){if(Q.head){if(A=Q.head.extra_len-Q.length,!Q.head.extra)Q.head.extra=new Uint8Array(Q.head.extra_len);Q.head.extra.set(G.subarray(Y,Y+q),A)}if(Q.flags&512&&Q.wrap&4)Q.check=o(Q.check,G,q,Y);K-=q,Y+=q,Q.length-=q}if(Q.length)break J}Q.length=0,Q.mode=y7;case y7:if(Q.flags&2048){if(K===0)break J;q=0;do if(A=G[Y+q++],Q.head&&A&&Q.length<65536)Q.head.name+=String.fromCharCode(A);while(A&&q<K);if(Q.flags&512&&Q.wrap&4)Q.check=o(Q.check,G,q,Y);if(K-=q,Y+=q,A)break J}else if(Q.head)Q.head.name=null;Q.length=0,Q.mode=b7;case b7:if(Q.flags&4096){if(K===0)break J;q=0;do if(A=G[Y+q++],Q.head&&A&&Q.length<65536)Q.head.comment+=String.fromCharCode(A);while(A&&q<K);if(Q.flags&512&&Q.wrap&4)Q.check=o(Q.check,G,q,Y);if(K-=q,Y+=q,A)break J}else if(Q.head)Q.head.comment=null;Q.mode=f7;case f7:if(Q.flags&512){while(X<16){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if(Q.wrap&4&&U!==(Q.check&65535)){J.msg="header crc mismatch",Q.mode=m;break}U=0,X=0}if(Q.head)Q.head.hcrc=Q.flags>>9&1,Q.head.done=!0;J.adler=Q.check=0,Q.mode=b5;break;case v7:while(X<32){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}J.adler=Q.check=r7(U),U=0,X=0,Q.mode=x8;case x8:if(Q.havedict===0)return J.next_out=Z,J.avail_out=$,J.next_in=Y,J.avail_in=K,Q.hold=U,Q.bits=X,XY;J.adler=Q.check=1,Q.mode=b5;case b5:if(W===ZY||W===I8)break J;case c0:if(Q.last){U>>>=X&7,X-=X&7,Q.mode=p0;break}while(X<3){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}switch(Q.last=U&1,U>>>=1,X-=1,U&3){case 0:Q.mode=_7;break;case 1:if(jY(Q),Q.mode=y8,W===I8){U>>>=2,X-=2;break J}break;case 2:Q.mode=h7;break;case 3:J.msg="invalid block type",Q.mode=m}U>>>=2,X-=2;break;case _7:U>>>=X&7,X-=X&7;while(X<32){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if((U&65535)!==(U>>>16^65535)){J.msg="invalid stored block lengths",Q.mode=m;break}if(Q.length=U&65535,U=0,X=0,Q.mode=m0,W===I8)break J;case m0:Q.mode=x7;case x7:if(q=Q.length,q){if(q>K)q=K;if(q>$)q=$;if(q===0)break J;z.set(G.subarray(Y,Y+q),Z),K-=q,Y+=q,$-=q,Z+=q,Q.length-=q;break}Q.mode=b5;break;case h7:while(X<14){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if(Q.nlen=(U&31)+257,U>>>=5,X-=5,Q.ndist=(U&31)+1,U>>>=5,X-=5,Q.ncode=(U&15)+4,U>>>=4,X-=4,Q.nlen>286||Q.ndist>30){J.msg="too many length or distance symbols",Q.mode=m;break}Q.have=0,Q.mode=u7;case u7:while(Q.have<Q.ncode){while(X<3){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}Q.lens[v[Q.have++]]=U&7,U>>>=3,X-=3}while(Q.have<19)Q.lens[v[Q.have++]]=0;if(Q.lencode=Q.lendyn,Q.lenbits=7,C={bits:Q.lenbits},N=s6(UY,Q.lens,0,19,Q.lencode,0,Q.work,C),Q.lenbits=C.bits,N){J.msg="invalid code lengths set",Q.mode=m;break}Q.have=0,Q.mode=g7;case g7:while(Q.have<Q.nlen+Q.ndist){for(;;){if(B=Q.lencode[U&(1<<Q.lenbits)-1],P=B>>>24,j=B>>>16&255,O=B&65535,P<=X)break;if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if(O<16)U>>>=P,X-=P,Q.lens[Q.have++]=O;else{if(O===16){T=P+2;while(X<T){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if(U>>>=P,X-=P,Q.have===0){J.msg="invalid bit length repeat",Q.mode=m;break}A=Q.lens[Q.have-1],q=3+(U&3),U>>>=2,X-=2}else if(O===17){T=P+3;while(X<T){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}U>>>=P,X-=P,A=0,q=3+(U&7),U>>>=3,X-=3}else{T=P+7;while(X<T){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}U>>>=P,X-=P,A=0,q=11+(U&127),U>>>=7,X-=7}if(Q.have+q>Q.nlen+Q.ndist){J.msg="invalid bit length repeat",Q.mode=m;break}while(q--)Q.lens[Q.have++]=A}}if(Q.mode===m)break;if(Q.lens[256]===0){J.msg="invalid code -- missing end-of-block",Q.mode=m;break}if(Q.lenbits=9,C={bits:Q.lenbits},N=s6(A9,Q.lens,0,Q.nlen,Q.lencode,0,Q.work,C),Q.lenbits=C.bits,N){J.msg="invalid literal/lengths set",Q.mode=m;break}if(Q.distbits=6,Q.distcode=Q.distdyn,C={bits:Q.distbits},N=s6(R9,Q.lens,Q.nlen,Q.ndist,Q.distcode,0,Q.work,C),Q.distbits=C.bits,N){J.msg="invalid distances set",Q.mode=m;break}if(Q.mode=y8,W===I8)break J;case y8:Q.mode=b8;case b8:if(K>=6&&$>=258){if(J.next_out=Z,J.avail_out=$,J.next_in=Y,J.avail_in=K,Q.hold=U,Q.bits=X,JY(J,F),Z=J.next_out,z=J.output,$=J.avail_out,Y=J.next_in,G=J.input,K=J.avail_in,U=Q.hold,X=Q.bits,Q.mode===b5)Q.back=-1;break}Q.back=0;for(;;){if(B=Q.lencode[U&(1<<Q.lenbits)-1],P=B>>>24,j=B>>>16&255,O=B&65535,P<=X)break;if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if(j&&(j&240)===0){M=P,R=j,E=O;for(;;){if(B=Q.lencode[E+((U&(1<<M+R)-1)>>M)],P=B>>>24,j=B>>>16&255,O=B&65535,M+P<=X)break;if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}U>>>=M,X-=M,Q.back+=M}if(U>>>=P,X-=P,Q.back+=P,Q.length=O,j===0){Q.mode=l7;break}if(j&32){Q.back=-1,Q.mode=b5;break}if(j&64){J.msg="invalid literal/length code",Q.mode=m;break}Q.extra=j&15,Q.mode=c7;case c7:if(Q.extra){T=Q.extra;while(X<T){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}Q.length+=U&(1<<Q.extra)-1,U>>>=Q.extra,X-=Q.extra,Q.back+=Q.extra}Q.was=Q.length,Q.mode=m7;case m7:for(;;){if(B=Q.distcode[U&(1<<Q.distbits)-1],P=B>>>24,j=B>>>16&255,O=B&65535,P<=X)break;if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if((j&240)===0){M=P,R=j,E=O;for(;;){if(B=Q.distcode[E+((U&(1<<M+R)-1)>>M)],P=B>>>24,j=B>>>16&255,O=B&65535,M+P<=X)break;if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}U>>>=M,X-=M,Q.back+=M}if(U>>>=P,X-=P,Q.back+=P,j&64){J.msg="invalid distance code",Q.mode=m;break}Q.offset=O,Q.extra=j&15,Q.mode=p7;case p7:if(Q.extra){T=Q.extra;while(X<T){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}Q.offset+=U&(1<<Q.extra)-1,U>>>=Q.extra,X-=Q.extra,Q.back+=Q.extra}if(Q.offset>Q.dmax){J.msg="invalid distance too far back",Q.mode=m;break}Q.mode=d7;case d7:if($===0)break J;if(q=F-$,Q.offset>q){if(q=Q.offset-q,q>Q.whave){if(Q.sane){J.msg="invalid distance too far back",Q.mode=m;break}}if(q>Q.wnext)q-=Q.wnext,L=Q.wsize-q;else L=Q.wnext-q;if(q>Q.length)q=Q.length;V=Q.window}else V=z,L=Z-Q.offset,q=Q.length;if(q>$)q=$;$-=q,Q.length-=q;do z[Z++]=V[L++];while(--q);if(Q.length===0)Q.mode=b8;break;case l7:if($===0)break J;z[Z++]=Q.length,$--,Q.mode=b8;break;case p0:if(Q.wrap){while(X<32){if(K===0)break J;K--,U|=G[Y++]<<X,X+=8}if(F-=$,J.total_out+=F,Q.total+=F,Q.wrap&4&&F)J.adler=Q.check=Q.flags?o(Q.check,z,F,Z-F):W8(Q.check,z,F,Z-F);if(F=$,Q.wrap&4&&(Q.flags?U:r7(U))!==Q.check){J.msg="incorrect data check",Q.mode=m;break}U=0,X=0}Q.mode=i7;case i7:if(Q.wrap&&Q.flags){while(X<32){if(K===0)break J;K--,U+=G[Y++]<<X,X+=8}if(Q.wrap&4&&U!==(Q.total&4294967295)){J.msg="incorrect length check",Q.mode=m;break}U=0,X=0}Q.mode=n7;case n7:N=KY;break J;case m:N=T9;break J;case w9:return E9;case N9:default:return M5}if(J.next_out=Z,J.avail_out=$,J.next_in=Y,J.avail_in=K,Q.hold=U,Q.bits=X,Q.wsize||F!==J.avail_out&&Q.mode<m&&(Q.mode<p0||W!==E7)){if(y9(J,J.output,J.next_out,F-J.avail_out));}if(H-=J.avail_in,F-=J.avail_out,J.total_in+=H,J.total_out+=F,Q.total+=F,Q.wrap&4&&F)J.adler=Q.check=Q.flags?o(Q.check,z,F,J.next_out-F):W8(Q.check,z,F,J.next_out-F);if(J.data_type=Q.bits+(Q.last?64:0)+(Q.mode===b5?128:0)+(Q.mode===y8||Q.mode===m0?256:0),(H===0&&F===0||W===E7)&&N===Y6)N=FY;return N},PY=(J)=>{if(z6(J))return M5;let W=J.state;if(W.window)W.window=null;return J.state=null,Y6},OY=(J,W)=>{if(z6(J))return M5;let Q=J.state;if((Q.wrap&2)===0)return M5;return Q.head=W,W.done=!1,Y6},CY=(J,W)=>{let Q=W.length,G,z,Y;if(z6(J))return M5;if(G=J.state,G.wrap!==0&&G.mode!==x8)return M5;if(G.mode===x8){if(z=1,z=W8(z,W,Q,0),z!==G.check)return T9}if(Y=y9(J,W,Q,Q),Y)return G.mode=w9,E9;return G.havedict=1,Y6},AY=k9,RY=S9,TY=D9,EY=BY,wY=I9,NY=MY,DY=PY,kY=OY,SY=CY,IY="pako inflate (from Nodeca project)",E5={inflateReset:AY,inflateReset2:RY,inflateResetKeep:TY,inflateInit:EY,inflateInit2:wY,inflate:NY,inflateEnd:DY,inflateGetHeader:kY,inflateSetDictionary:SY,inflateInfo:IY};function yY(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}var bY=yY,b9=Object.prototype.toString,{Z_NO_FLUSH:fY,Z_FINISH:a7,Z_OK:O6,Z_STREAM_END:i0,Z_NEED_DICT:n0,Z_STREAM_ERROR:vY,Z_DATA_ERROR:s7,Z_MEM_ERROR:_Y,Z_BUF_ERROR:t7}=G6,xY={chunkSize:65536,windowBits:15,to:""};function K8(J){this.options=u8.assign({},xY,J||{});let W=this.options;if(W.raw&&W.windowBits>=0&&W.windowBits<16){if(W.windowBits=-W.windowBits,W.windowBits===0)W.windowBits=-15}if(W.windowBits>=0&&W.windowBits<16&&!(J&&J.windowBits))W.windowBits+=32;if(W.windowBits>15&&W.windowBits<48){if((W.windowBits&15)===0)W.windowBits|=15}this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new O9,this.strm.avail_out=0;let Q=E5.inflateInit2(this.strm,W.windowBits);if(Q!==O6)throw Error(J6[Q]);if(this.header=new bY,E5.inflateGetHeader(this.strm,this.header),W.dictionary){if(typeof W.dictionary==="string")W.dictionary=G8.string2buf(W.dictionary);else if(b9.call(W.dictionary)==="[object ArrayBuffer]")W.dictionary=new Uint8Array(W.dictionary);if(W.raw){if(Q=E5.inflateSetDictionary(this.strm,W.dictionary),Q!==O6)throw Error(J6[Q])}}}K8.prototype.push=function(J,W){let Q=this.strm,G=this.options.chunkSize,z=this.options.dictionary,Y,Z,K;if(this.ended)return!1;if(W===~~W)Z=W;else Z=W===!0?a7:fY;if(b9.call(J)==="[object ArrayBuffer]")Q.input=new Uint8Array(J);else Q.input=J;Q.next_in=0,Q.avail_in=Q.input.length;for(;;){if(Q.avail_out===0)Q.output=new Uint8Array(G),Q.next_out=0,Q.avail_out=G;if(Y=E5.inflate(Q,Z),Y===n0&&z){if(Y=E5.inflateSetDictionary(Q,z),Y===O6)Y=E5.inflate(Q,Z);else if(Y===s7)Y=n0}while(Q.avail_in>0&&Y===i0&&Q.state.wrap&2&&Q.state.flags!==0&&Q.input[Q.next_in]!==0)E5.inflateReset(Q),Y=E5.inflate(Q,Z);switch(Y){case vY:case s7:case n0:case _Y:return this.onEnd(Y),this.ended=!0,!1}if(K=Q.avail_out,Q.next_out){if(Q.avail_out===0||Y===i0||Z>0)if(this.options.to==="string"){let $=G8.utf8border(Q.output,Q.next_out),U=Q.next_out-$,X=G8.buf2string(Q.output,$);if(Q.next_out=U,Q.avail_out=G-U,U)Q.output.set(Q.output.subarray($,$+U),0);this.onData(X)}else this.onData(Q.output.length===Q.next_out?Q.output:Q.output.subarray(0,Q.next_out)),Q.avail_out=0,Q.next_out=0}if((Y===O6||Y===t7)&&K===0)continue;if(Y===i0)return Y=E5.inflateEnd(this.strm),this.onEnd(Y),this.ended=!0,!0;if(Q.avail_in===0){if(Z===a7)return Y=E5.inflateEnd(this.strm),this.onEnd(Y===O6?t7:Y),this.ended=!0,!1;break}}return!0};K8.prototype.onData=function(J){this.chunks.push(J)};K8.prototype.onEnd=function(J){if(J===O6)if(this.options.to==="string")this.result=this.chunks.join("");else this.result=u8.flattenChunks(this.chunks);this.chunks=[],this.err=J,this.msg=this.strm.msg};function FJ(J,W){let Q=new K8(W);if(Q.push(J,!0),Q.err)throw Q.msg||J6[Q.err];return Q.result}function hY(J,W){return W=W||{},W.raw=!0,FJ(J,W)}var uY=K8,gY=FJ,cY=hY,mY=FJ,pY=G6,dY={Inflate:uY,inflate:gY,inflateRaw:cY,ungzip:mY,constants:pY},{Deflate:lY,deflate:iY,deflateRaw:nY,gzip:rY}=t4,{Inflate:oY,inflate:aY,inflateRaw:sY,ungzip:tY}=dY,eY=lY,JG=iY,QG=nY,WG=rY,YG=oY,GG=aY,zG=sY,UG=tY,ZG=G6,HJ={Deflate:eY,deflate:JG,deflateRaw:QG,gzip:WG,Inflate:YG,inflate:GG,inflateRaw:zG,ungzip:UG,constants:ZG};var K6=new d6({ignoreAttributes:!1,attributeNamePrefix:"@_",textNodeName:"#text",trimValues:!1}),D6=new b0({ignoreAttributes:!1,attributeNamePrefix:"@_",textNodeName:"#text",format:!1,suppressEmptyNode:!0}),s9=[".drawio",".xml"],f9=[...s9,".bak"],X6=20971520,FG=104857600,HG="http://127.0.0.1:18765/ImageExport4/export",RJ="#ffffff",H8=43200000,$G=3000,v9=20,qG=1800000,VG=7200000,O5="__ai_preview_",LG=20,BG=2000,jG=2,MG=0.25,PG=8388608,t9=1,$8=/^h_[A-Za-z0-9_-]+_[A-Fa-f0-9]{8,}$/,TJ=/^[A-Za-z0-9_.:-]+$/,OG=["DRAWIO_WEB_URL","DRAWIO_BRIDGE_HOST","DRAWIO_BRIDGE_PORT","DRAWIO_EXPORT_URL","DRAWIO_REQUEST_TIMEOUT","DRAWIO_MAX_INPUT_SIZE_MB","DRAWIO_MAX_OUTPUT_SIZE_MB"],kJ="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;jumpStyle=arc;jumpSize=10;endArrow=block;endFill=1;";function _5(J){if(J===void 0)return[];return Array.isArray(J)?J:[J]}function S(J){return J===void 0||J===null?void 0:String(J)}function e(J){if(J===void 0||J===null||J==="")return;let W=Number(J);return Number.isFinite(W)?W:void 0}function S5(J){return J.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;")}function e9(J){let W=J.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase();if(/^[\x00-\x7f]*$/.test(J)&&W)return W;let Q=Q0("sha256").update(J).digest("hex").slice(0,12);return`${W||"diagram"}-${Q}`}function y6(J){let W=J.directory.trim();if(!W)throw Error("OpenCode did not provide a workspace directory");return w.resolve(W)}async function J1(J){let W=w.join(y6({directory:J}),".env"),Q;try{Q=await I.readFile(W,"utf8")}catch(z){if(z.code==="ENOENT")return;throw Error(`cannot read workspace .env at ${W}: ${z.message}`)}let G={};for(let z of Q.replace(/^\uFEFF/,"").split(/\r?\n/)){let Y=z.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);if(!Y)continue;let[,Z,K]=Y,$=K.trim(),U=$[0],X=U==='"'||U==="'"||U==="`"?$.lastIndexOf(U):-1,H=X>0?$.slice(1,X):$.replace(/\s+#.*$/,"").trim();if(U==='"'&&X>0)H=H.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\"/g,'"').replace(/\\\\/g,"\\");G[Z]=H}for(let z of OG)if(!process.env[z]?.trim()&&G[z]!==void 0)process.env[z]=G[z]}function h(J,W){return w.relative(y6(J),W)}function a8(J,W,Q){if(!W.trim())throw Error("file must be a non-empty path");if(w.isAbsolute(W))throw Error("absolute paths are not allowed; use a workspace-relative path");let G=y6(J),z=w.resolve(G,W),Y=w.relative(G,z),Z=String.fromCharCode(46).repeat(2);if(!Y||Y===Z||Y.startsWith(Z+w.sep)||w.isAbsolute(Y))throw Error("file must resolve to a file inside the current workspace");let K=z.toLowerCase();if(!Q.some(($)=>K.endsWith($)))throw Error(`unsupported file extension; expected ${Q.join(" or ")}`);return z}function P5(J,W){return a8(J,W,s9)}async function C5(J){let W=await I.stat(J);if(!W.isFile())throw Error("target is not a regular file");if(W.size>X6)throw Error(`file is larger than the ${X6/1024/1024} MB MVP limit`);return I.readFile(J,"utf8")}function Q1(J){let W=Buffer.from(J.trim(),"base64"),Q=new TextDecoder().decode(HJ.inflateRaw(W));return decodeURIComponent(Q)}function W1(J){let W=encodeURIComponent(J),Q=HJ.deflateRaw(new TextEncoder().encode(W));return Buffer.from(Q).toString("base64")}function CG(J){let W=J.mxGeometry;if(!W||typeof W!=="object")return;let Q=W,z=_5(Q.Array).filter(($)=>S($["@_as"])==="points").flatMap(($)=>_5($.mxPoint)).map(($)=>({x:e($["@_x"]),y:e($["@_y"])})).filter(($)=>$.x!==void 0&&$.y!==void 0),Y=_5(Q.mxPoint).find(($)=>S($["@_as"])==="offset"),Z=Y?e(Y["@_x"]):void 0,K=Y?e(Y["@_y"]):void 0;return{x:e(Q["@_x"]),y:e(Q["@_y"]),width:e(Q["@_width"]),height:e(Q["@_height"]),relative:S(Q["@_relative"])==="1",offset:Z!==void 0||K!==void 0?{x:Z||0,y:K||0}:void 0,points:z}}function $J(J){let W=D8.validate(J);if(W!==!0)throw Error(`invalid mxGraphModel XML: ${JSON.stringify(W)}`);let z=K6.parse(J).mxGraphModel?.root;if(!z)throw Error("diagram page does not contain mxGraphModel/root");return _5(z.mxCell).map((Y)=>({id:S(Y["@_id"])||"",parent:S(Y["@_parent"]),source:S(Y["@_source"]),target:S(Y["@_target"]),label:S(Y["@_value"]),style:S(Y["@_style"]),vertex:S(Y["@_vertex"])==="1",edge:S(Y["@_edge"])==="1",geometry:CG(Y)}))}function qJ(J){let Q=K6.parse(J).mxGraphModel;return{background:S(Q?.["@_background"])||""}}function f(J){let W=D8.validate(J);if(W!==!0)throw Error(`invalid draw.io XML: ${JSON.stringify(W)}`);let Q=K6.parse(J);if(Q.mxGraphModel)return[{id:"page-1",name:"Page-1",compressed:!1,properties:qJ(J),cells:$J(J)}];let G=Q.mxfile;if(!G)throw Error("root element must be mxfile or mxGraphModel");let z=_5(G.diagram);if(z.length===0)throw Error("mxfile contains no diagram pages");return z.map((Y,Z)=>{let K=S(Y["@_id"])||`page-${Z+1}`,$=S(Y["@_name"])||`Page-${Z+1}`,U=Y.mxGraphModel;if(U&&typeof U==="object"){let F=D6.build({mxGraphModel:U});return{id:K,name:$,compressed:!1,properties:qJ(F),cells:$J(F)}}let X=S(Y["#text"]);if(!X?.trim())throw Error(`page ${$} has no diagram data`);let H=Q1(X);return{id:K,name:$,compressed:!0,properties:qJ(H),cells:$J(H)}})}function Z6(J){let W=D8.validate(J);if(W!==!0)throw Error(`invalid draw.io XML: ${JSON.stringify(W)}`);let Q=K6.parse(J);if(Q.mxGraphModel&&typeof Q.mxGraphModel==="object")return{document:Q,directModel:!0,pages:[{id:"page-1",name:"Page-1",compressed:!1,diagram:null,model:Q.mxGraphModel}]};let G=Q.mxfile;if(!G)throw Error("root element must be mxfile or mxGraphModel");let z=_5(G.diagram);if(z.length===0)throw Error("mxfile contains no diagram pages");let Y=z.map((Z,K)=>{let $={id:S(Z["@_id"])||`page-${K+1}`,name:S(Z["@_name"])||`Page-${K+1}`,compressed:!1,diagram:Z,model:{}};if(Z.mxGraphModel&&typeof Z.mxGraphModel==="object")return $.model=Z.mxGraphModel,$;let U=S(Z["#text"]);if(!U?.trim())throw Error(`page ${$.name} has no diagram data`);let X=K6.parse(Q1(U));if(!X.mxGraphModel||typeof X.mxGraphModel!=="object")throw Error(`page ${$.name} has no mxGraphModel`);return $.compressed=!0,$.model=X.mxGraphModel,$});return{document:Q,directModel:!1,pages:Y}}function q8(J){if(J.directModel)return J.document.mxGraphModel=J.pages[0].model,`${D6.build(J.document)}
`;for(let W of J.pages){let Q=W.diagram;if(W.compressed)delete Q.mxGraphModel,Q["#text"]=W1(D6.build({mxGraphModel:W.model}));else delete Q["#text"],Q.mxGraphModel=W.model}return`${D6.build(J.document)}
`}function F6(J){let W=J.model.root;if(!W)throw Error(`page ${J.name} has no mxGraphModel/root`);let Q=_5(W.mxCell);return W.mxCell=Q,Q}function _9(J,W){if(!W?.trim())return J.pages[0];let Q=J.pages.find((G)=>G.id===W||G.name===W);if(!Q)throw Error(`diagram page not found: ${W}`);return Q}function Z5(J){return S(J["@_id"])||""}function m5(J){return S(J["@_vertex"])==="1"}function i8(J){return S(J["@_edge"])==="1"}function p5(J){if(!J.mxGeometry||typeof J.mxGeometry!=="object")J.mxGeometry={"@_as":"geometry"};return J.mxGeometry}function AG(J){let W=J.filter(m5);if(W.length===0)return{x:80,y:80};let Q=80;for(let G of W){let z=p5(G),Y=e(z["@_y"])||0,Z=e(z["@_height"])||70;Q=Math.max(Q,Y+Z)}return{x:80,y:Q+60}}var RG={font_size:"fontSize",font_family:"fontFamily",font_color:"fontColor",fill_color:"fillColor",stroke_color:"strokeColor",stroke_width:"strokeWidth",opacity:"opacity",rounded:"rounded",dashed:"dashed"};function Y1(J){return(J||"").split(";").map((W)=>W.trim()).filter(Boolean).map((W)=>{let Q=W.indexOf("=");return Q<0?[W,""]:[W.slice(0,Q),W.slice(Q+1)]})}function TG(J){return Object.fromEntries(Y1(J).toSorted(([W],[Q])=>W.localeCompare(Q)))}function c8(J,W){if(!W)return J||"";let Q=Y1(J),G=new Map(Q);for(let[Z,K]of Object.entries(RG)){let $=W[Z];if($===void 0)continue;if(typeof $==="string"&&(!$.trim()||/[;=\r\n]/.test($)))throw Error(`style_updates.${Z} contains an unsafe Draw.io style delimiter`);G.set(K,typeof $==="boolean"?$?"1":"0":String($))}let z=new Set,Y=[];for(let[Z]of Q){if(z.has(Z))continue;z.add(Z);let K=G.get(Z)||"";Y.push(`${Z}${K===""?"":`=${K}`}`)}for(let[Z,K]of G){if(z.has(Z))continue;Y.push(`${Z}${K===""?"":`=${K}`}`)}return Y.length>0?`${Y.join(";")};`:""}function EG(J,W){let Q=F6(J),G=[],z=(Y)=>Q.find((Z)=>Z5(Z)===Y);for(let Y of W){if(!TJ.test(Y.id)||Y.id==="0"||Y.id==="1")throw Error(`invalid or reserved operation id: ${Y.id}`);let Z=z(Y.id);if(Y.type==="add-node"){if(Z)throw Error(`cell already exists: ${Y.id}`);if(!Y.label?.trim())throw Error(`add-node ${Y.id} requires label`);let K=AG(Q);Q.push({"@_id":Y.id,"@_value":Y.label,"@_style":c8(EJ(Y.kind),Y.style_updates),"@_vertex":"1","@_parent":"1",mxGeometry:{"@_x":Y.x??K.x,"@_y":Y.y??K.y,"@_width":Y.width??(Y.kind==="decision"?140:160),"@_height":Y.height??(Y.kind==="decision"?100:70),"@_as":"geometry"}}),G.push(Y.id);continue}if(Y.type==="add-edge"){if(Z)throw Error(`cell already exists: ${Y.id}`);if(!Y.source||!z(Y.source)||!m5(z(Y.source)))throw Error(`add-edge ${Y.id} has unknown vertex source: ${Y.source||"(empty)"}`);if(!Y.target||!z(Y.target)||!m5(z(Y.target)))throw Error(`add-edge ${Y.id} has unknown vertex target: ${Y.target||"(empty)"}`);Q.push({"@_id":Y.id,"@_value":Y.label||"","@_style":c8(kJ,Y.style_updates),"@_edge":"1","@_parent":"1","@_source":Y.source,"@_target":Y.target,mxGeometry:{"@_relative":"1","@_as":"geometry"}}),G.push(Y.id);continue}if(!Z)throw Error(`cell not found: ${Y.id}`);if(Y.type==="update-node"){if(!m5(Z))throw Error(`${Y.id} is not a node`);if(Y.label!==void 0)Z["@_value"]=Y.label;if(Y.kind!==void 0)Z["@_style"]=EJ(Y.kind);if(Y.style_updates!==void 0)Z["@_style"]=c8(S(Z["@_style"]),Y.style_updates);let K=p5(Z);if(Y.x!==void 0)K["@_x"]=Y.x;if(Y.y!==void 0)K["@_y"]=Y.y;if(Y.width!==void 0)K["@_width"]=Y.width;if(Y.height!==void 0)K["@_height"]=Y.height;G.push(Y.id);continue}if(Y.type==="update-edge"){if(!i8(Z))throw Error(`${Y.id} is not an edge`);if(Y.source!==void 0){let K=z(Y.source);if(!K||!m5(K))throw Error(`update-edge ${Y.id} has unknown vertex source: ${Y.source}`);Z["@_source"]=Y.source}if(Y.target!==void 0){let K=z(Y.target);if(!K||!m5(K))throw Error(`update-edge ${Y.id} has unknown vertex target: ${Y.target}`);Z["@_target"]=Y.target}if(Y.label!==void 0)Z["@_value"]=Y.label;if(Y.style_updates!==void 0)Z["@_style"]=c8(S(Z["@_style"]),Y.style_updates);G.push(Y.id);continue}if(Y.type==="remove-edge"){if(!i8(Z))throw Error(`${Y.id} is not an edge`);Q.splice(Q.indexOf(Z),1),G.push(Y.id);continue}if(Y.type==="remove-node"){if(!m5(Z))throw Error(`${Y.id} is not a node`);let K=Q.filter(($)=>i8($)&&(S($["@_source"])===Y.id||S($["@_target"])===Y.id));if(K.length>0&&!Y.cascade)throw Error(`remove-node ${Y.id} has ${K.length} connected edge(s); set cascade=true`);for(let $ of K)G.push(Z5($)),Q.splice(Q.indexOf($),1);Q.splice(Q.indexOf(Z),1),G.push(Y.id)}}return[...new Set(G)]}function x9(J){let W=new Map;for(let Q of J)for(let G of Q.cells)if(G.vertex||G.edge)W.set(`${Q.id}:${G.id}`,G);return W}function d5(J){return{label:J.label||"",parent:J.parent||"",source:J.source||"",target:J.target||"",style:TG(J.style),geometry:J.geometry||{}}}function w6(J,W){let Q=x9(J),G=x9(W),z=[],Y=[],Z=[],K=[];for(let[X,H]of G){if(!Q.has(X)){z.push({key:X,cell:H});continue}let F=d5(Q.get(X)),q=d5(H);if(JSON.stringify(F)!==JSON.stringify(q)){let L=Object.keys(q).filter((M)=>JSON.stringify(F[M])!==JSON.stringify(q[M])),B=[...new Set([...Object.keys(F.style),...Object.keys(q.style)])].filter((M)=>F.style[M]!==q.style[M]).sort().map((M)=>({property:M,before:F.style[M]??null,after:q.style[M]??null})),j=[...new Set([...Object.keys(F.geometry),...Object.keys(q.geometry)])].filter((M)=>JSON.stringify(F.geometry[M])!==JSON.stringify(q.geometry[M])).sort().map((M)=>({property:M,before:F.geometry[M]??null,after:q.geometry[M]??null})),O=X.slice(0,Math.max(0,X.length-H.id.length-1));Z.push({key:X,pageId:O,cellId:H.id,kind:H.edge?"edge":"node",changedFields:L,styleChanges:B,geometryChanges:j,labelChange:F.label!==q.label?{before:F.label,after:q.label}:null,before:F,after:q})}}for(let[X,H]of Q)if(!G.has(X))Y.push({key:X,cell:H});let $=new Map(J.map((X)=>[X.id,X])),U=new Map(W.map((X)=>[X.id,X]));for(let X of new Set([...$.keys(),...U.keys()])){let H=$.get(X),F=U.get(X),q=F?.name||H?.name||X;if(!H||!F){K.push({pageId:X,pageName:q,property:"page",before:H?"present":null,after:F?"present":null});continue}if(H.name!==F.name)K.push({pageId:X,pageName:q,property:"name",before:H.name,after:F.name});if(H.properties.background!==F.properties.background)K.push({pageId:X,pageName:q,property:"background",before:H.properties.background||null,after:F.properties.background||null})}return{added:z,removed:Y,changed:Z,pageChanges:K,summary:{added:z.length,removed:Y.length,changed:Z.length,pagesChanged:new Set(K.map((X)=>X.pageId)).size,unchanged:[...G.keys()].filter((X)=>Q.has(X)&&JSON.stringify(d5(Q.get(X)))===JSON.stringify(d5(G.get(X)))).length}}}function s8(J){if(Array.isArray(J))return J.map(s8);if(!J||typeof J!=="object")return J;return Object.fromEntries(Object.entries(J).sort(([W],[Q])=>W.localeCompare(Q)).map(([W,Q])=>[W,s8(Q)]))}function k6(J){return J===void 0?"<missing>":JSON.stringify(s8(J))}function G1(J,W,Q,G=[]){let z=k6(J),Y=k6(W),Z=k6(Q);if(Y===Z)return{userValue:W,agentValue:W,conflicts:[]};if(Y===z)return{userValue:Q,agentValue:Q,conflicts:[]};if(Z===z)return{userValue:W,agentValue:W,conflicts:[]};if(J5(J)&&J5(W)&&J5(Q)){let K={},$={},U=[],X=new Set([...Object.keys(J),...Object.keys(W),...Object.keys(Q)]);for(let H of X){let F=G1(J[H],W[H],Q[H],[...G,H]);if(F.userValue!==void 0)K[H]=F.userValue;if(F.agentValue!==void 0)$[H]=F.agentValue;U.push(...F.conflicts)}return{userValue:K,agentValue:$,conflicts:U}}return{userValue:W,agentValue:Q,conflicts:[{path:G.join(".")||"existence",user:{exists:W!==void 0,value:W},agent:{exists:Q!==void 0,value:Q}}]}}function VJ(J){let W=new Map;for(let Q of F6(J)){let G=S(Q["@_id"]);if(!G)throw Error(`page ${J.name} contains a cell without a stable id`);if(W.has(G))throw Error(`page ${J.name} contains duplicate cell id ${G}`);W.set(G,Q)}return W}function LJ(J){if(!J)return{exists:!1,kind:"cell",label:"",style:"",parent:null,source:null,target:null,geometry:null};let W=J5(J.mxGeometry)?J.mxGeometry:null;return{exists:!0,kind:S(J["@_vertex"])==="1"?"node":S(J["@_edge"])==="1"?"edge":"cell",label:S(J["@_value"]),style:S(J["@_style"]),parent:S(J["@_parent"])||null,source:S(J["@_source"])||null,target:S(J["@_target"])||null,geometry:W?{x:S(W["@_x"])||null,y:S(W["@_y"])||null,width:S(W["@_width"])||null,height:S(W["@_height"])||null}:null}}function BJ(J){let W=J.diagram?Object.fromEntries(Object.entries(J.diagram).filter(([z])=>z!=="mxGraphModel"&&z!=="#text")):null,Q=Object.fromEntries(Object.entries(J.model).filter(([z])=>!["root","@_dx","@_dy"].includes(z))),G=J.model.root&&typeof J.model.root==="object"?Object.fromEntries(Object.entries(J.model.root).filter(([z])=>z!=="mxCell")):null;return JSON.stringify(s8({diagram:W,model:Q,root:G}))}function h9(J,W,Q,G,z){let Y=F6(J.get(Q)),Z=Y.findIndex((H)=>S(H["@_id"])===G);if(z===void 0){if(Z>=0)Y.splice(Z,1);return}if(Z>=0){Y[Z]=structuredClone(z);return}let K=F6(W.get(Q)).map((H)=>S(H["@_id"])),$=K.indexOf(G),U=[...K.slice(0,$)].reverse().find((H)=>Y.some((F)=>S(F["@_id"])===H)),X=K.slice($+1).find((H)=>Y.some((F)=>S(F["@_id"])===H));if(U){let H=Y.findIndex((F)=>S(F["@_id"])===U);Y.splice(H+1,0,structuredClone(z))}else if(X){let H=Y.findIndex((F)=>S(F["@_id"])===X);Y.splice(H,0,structuredClone(z))}else Y.push(structuredClone(z))}function wG(J,W,Q){try{let G=Z6(J),z=Z6(W),Y=Z6(Q);if(G.directModel!==z.directModel||G.directModel!==Y.directModel)return{status:"unavailable",reason:"document container structure changed"};let Z=new Map(G.pages.map((C)=>[C.id,C])),K=new Map(z.pages.map((C)=>[C.id,C])),$=new Map(Y.pages.map((C)=>[C.id,C])),U=[...Z.keys()].sort();if(JSON.stringify([...K.keys()].sort())!==JSON.stringify(U)||JSON.stringify([...$.keys()].sort())!==JSON.stringify(U))return{status:"unavailable",reason:"page additions or removals require user confirmation"};let X=G.pages.map((C)=>C.id),H=z.pages.map((C)=>C.id),F=Y.pages.map((C)=>C.id);if(JSON.stringify(H)!==JSON.stringify(X)&&JSON.stringify(H)!==JSON.stringify(F))return{status:"unavailable",reason:"local page order changed"};let q=[],L=[],V=[],B=[],P=[];for(let C of U){let T=Z.get(C),v=K.get(C),i=$.get(C),y=BJ(T),n=BJ(v),u=BJ(i);if(n!==y&&n!==u)return{status:"unavailable",reason:`local page metadata changed for ${C}`};let L5=VJ(T),r=VJ(v),t=VJ(i),$6=new Set([...L5.keys()].filter((p)=>r.has(p)&&t.has(p))),b1=[...L5.keys()].filter((p)=>$6.has(p)),gJ=[...r.keys()].filter((p)=>$6.has(p)),f1=[...t.keys()].filter((p)=>$6.has(p));if(JSON.stringify(gJ)!==JSON.stringify(b1)&&JSON.stringify(gJ)!==JSON.stringify(f1))return{status:"unavailable",reason:`local cell order changed for page ${C}`};let v1=new Set([...L5.keys(),...r.keys(),...t.keys()]);for(let p of v1){let b6=`${C}:${p}`,cJ=k6(L5.get(p)),_1=k6(r.get(p)),x1=k6(t.get(p)),h1=_1!==cJ,u1=x1!==cJ;if(h1)q.push(b6);if(u1)L.push(b6);let f6=G1(L5.get(p),r.get(p),t.get(p));if(P.push({key:b6,pageId:C,cellId:p,userCell:f6.userValue,agentCell:f6.agentValue}),f6.conflicts.length>0){V.push(b6);let g1=LJ(L5.get(p)),c1=LJ(r.get(p)),m1=LJ(t.get(p));B.push({key:b6,pageId:C,pageName:T.name,cellId:p,changedFields:f6.conflicts.map((p1)=>p1.path),fields:f6.conflicts,base:g1,user:c1,agent:m1})}}}let j=structuredClone(Y),O=structuredClone(Y),M=new Map(j.pages.map((C)=>[C.id,C])),R=new Map(O.pages.map((C)=>[C.id,C]));for(let C of P)h9(M,K,C.pageId,C.cellId,C.userCell),h9(R,K,C.pageId,C.cellId,C.agentCell);let E=q8(j),A=q8(O),N=l(f(E)),D=l(f(A));if(!N.valid||!D.valid)return{status:"unavailable",reason:`merged diagram is invalid: ${[...N.errors,...D.errors].join("; ")}`};if(V.length>0)return{status:"conflict",conflicts:V,details:B,userResolutionXml:E,agentResolutionXml:A,localChangedKeys:q,remoteChangedKeys:L};return{status:"merged",xml:E,localChangedKeys:q,remoteChangedKeys:L}}catch(G){return{status:"unavailable",reason:`automatic merge failed: ${G.message}`}}}function NG(J,W){if(J.length===0)throw Error("nodes must contain at least one node");let Q=new Set;for(let z of J){if(!TJ.test(z.id)||z.id==="0"||z.id==="1")throw Error(`invalid or reserved node id: ${z.id}`);if(!z.label.trim())throw Error(`node ${z.id} has an empty label`);if(Q.has(z.id))throw Error(`duplicate node id: ${z.id}`);Q.add(z.id)}let G=new Set;for(let[z,Y]of W.entries()){let Z=Y.id||`edge-${z+1}`;if(!TJ.test(Z)||Z==="0"||Z==="1")throw Error(`invalid or reserved edge id: ${Z}`);if(G.has(Z)||Q.has(Z))throw Error(`duplicate cell id: ${Z}`);if(!Q.has(Y.source))throw Error(`edge ${Z} has unknown source: ${Y.source}`);if(!Q.has(Y.target))throw Error(`edge ${Z} has unknown target: ${Y.target}`);G.add(Z)}}function z1(J,W){let Q=new Map(J.map((K)=>[K.id,0])),G=new Map(J.map((K)=>[K.id,[]])),z=new Map(J.map((K)=>[K.id,0]));for(let K of W)Q.set(K.target,(Q.get(K.target)||0)+1),G.get(K.source)?.push(K.target);let Y=J.filter((K)=>Q.get(K.id)===0).map((K)=>K.id),Z=new Set;while(Y.length>0){let K=Y.shift();if(Z.has(K))continue;Z.add(K);for(let $ of G.get(K)||[])if(z.set($,Math.max(z.get($)||0,(z.get(K)||0)+1)),Q.set($,(Q.get($)||1)-1),Q.get($)===0)Y.push($)}return z}function EJ(J){return"rounded=1;whiteSpace=wrap;html=1;arcSize=12;strokeWidth=1.5;"+{default:"fillColor=#dae8fc;strokeColor=#6c8ebf;",application:"fillColor=#d5e8d4;strokeColor=#82b366;",service:"fillColor=#dae8fc;strokeColor=#6c8ebf;",database:"shape=cylinder3;boundedLbl=1;backgroundOutline=1;fillColor=#fff2cc;strokeColor=#d6b656;",external:"dashed=1;fillColor=#f5f5f5;strokeColor=#666666;",decision:"rhombus;fillColor=#ffe6cc;strokeColor=#d79b00;"}[J||"default"]}function DG(J,W,Q){let G=z1(J,W),z=new Map,Y=Math.max(1,...J.map((H)=>W.filter((F)=>F.source===H.id).length)),Z=Math.max(240,200+Y*20),K=140,$=new Map;for(let H of J){let F=G.get(H.id)||0,q=z.get(F)||[];q.push(H),z.set(F,q)}for(let H of J){let F=G.get(H.id)||0,q=(z.get(F)||[]).findIndex((B)=>B.id===H.id),L=H.kind==="decision"?140:160,V=H.kind==="decision"?100:70;$.set(H.id,{x:Q==="left-to-right"?80+F*Z:80+q*Z,y:Q==="left-to-right"?80+q*140:80+F*140,width:L,height:V})}let U=J.map((H)=>{let F=$.get(H.id);return`      <mxCell id="${S5(H.id)}" value="${S5(H.label)}" style="${S5(EJ(H.kind))}" vertex="1" parent="1">
        <mxGeometry x="${F.x}" y="${F.y}" width="${F.width}" height="${F.height}" as="geometry"/>
      </mxCell>`}),X=W.map((H,F)=>{let q=H.id||`edge-${F+1}`,L=$.get(H.source),V=$.get(H.target),B=W.filter((R)=>R.source===H.source),P=B.indexOf(H),j=(P-(B.length-1)/2)*18,O=kJ,M;if(Q==="left-to-right"){let R=L.x+L.width,E=V.x,A=E>R?(R+E)/2+j:Math.max(R,V.x+V.width)+80+P*18,N=L.y+L.height/2,D=V.y+V.height/2;O+="exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;",M=`          <mxPoint x="${A}" y="${N}"/>
          <mxPoint x="${A}" y="${D}"/>`}else{let R=L.y+L.height,E=V.y,A=E>R?(R+E)/2+j:Math.max(R,V.y+V.height)+80+P*18,N=L.x+L.width/2,D=V.x+V.width/2;O+="exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;",M=`          <mxPoint x="${N}" y="${A}"/>
          <mxPoint x="${D}" y="${A}"/>`}return`      <mxCell id="${S5(q)}" value="${S5(H.label||"")}" style="${O}" edge="1" parent="1" source="${S5(H.source)}" target="${S5(H.target)}">
        <mxGeometry relative="1" as="geometry">
          <Array as="points">
${M}
          </Array>
        </mxGeometry>
      </mxCell>`});return`<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
${[...U,...X].join(`
`)}
  </root>
</mxGraphModel>`}function u9(J,W,Q,G,z){let Y=DG(W,Q,G),Z=`page-${e9(J)}`,K=z?W1(Y):Y;return`<mxfile host="OpenWork" modified="${new Date().toISOString()}" agent="drawio-expert" version="26.0.0">
  <diagram id="${S5(Z)}" name="${S5(J)}">${K}</diagram>
</mxfile>
`}function l(J){let W=[],Q=[];for(let G of J){let z=new Set;for(let Z of G.cells){if(!Z.id){W.push(`${G.name}: cell without id`);continue}if(z.has(Z.id))W.push(`${G.name}: duplicate cell id ${Z.id}`);z.add(Z.id)}for(let Z of G.cells){if(Z.parent&&!z.has(Z.parent))W.push(`${G.name}: ${Z.id} references missing parent ${Z.parent}`);if(Z.edge){if(!Z.source||!z.has(Z.source))W.push(`${G.name}: edge ${Z.id} has missing source ${Z.source||"(empty)"}`);if(!Z.target||!z.has(Z.target))W.push(`${G.name}: edge ${Z.id} has missing target ${Z.target||"(empty)"}`)}if(Z.vertex){if(!Z.geometry)W.push(`${G.name}: vertex ${Z.id} has no geometry`);else if(Z.geometry.width!==void 0&&Z.geometry.width<=0||Z.geometry.height!==void 0&&Z.geometry.height<=0)W.push(`${G.name}: vertex ${Z.id} has non-positive dimensions`);if(!Z.label?.trim())Q.push(`${G.name}: vertex ${Z.id} has an empty label`)}}let Y=G.cells.filter((Z)=>Z.vertex&&Z.geometry?.x!==void 0&&Z.geometry?.y!==void 0&&Z.geometry?.width!==void 0&&Z.geometry?.height!==void 0);for(let Z=0;Z<Y.length;Z+=1){let K=Y[Z];for(let $=Z+1;$<Y.length;$+=1){let U=Y[$];if(K.parent!==U.parent)continue;let X=K.geometry,H=U.geometry;if(X.x<H.x+H.width&&X.x+X.width>H.x&&X.y<H.y+H.height&&X.y+X.height>H.y)Q.push(`${G.name}: nodes ${K.id} and ${U.id} overlap`)}}}return{valid:W.length===0,errors:W,warnings:Q,stats:{pages:J.length,nodes:J.reduce((G,z)=>G+z.cells.filter((Y)=>Y.vertex).length,0),edges:J.reduce((G,z)=>G+z.cells.filter((Y)=>Y.edge).length,0)}}}function S6(J){return{cellsById:new Map(J.map((W)=>[W.id,W])),absoluteGeometry:new Map}}function SJ(J,W,Q=new Set){if(W.absoluteGeometry.has(J.id))return W.absoluteGeometry.get(J.id)||null;let G=J.geometry;if(!G)return W.absoluteGeometry.set(J.id,null),null;if(Q.has(J.id))return null;Q.add(J.id);let z=J.parent?W.cellsById.get(J.parent):void 0,Y=z?SJ(z,W,Q):null,Z=G.x||0,K=G.y||0,$=Z,U=K;if(Y)if(G.relative)$=Y.x+Z*Y.width+(G.offset?.x||0),U=Y.y+K*Y.height+(G.offset?.y||0);else $=Y.x+Z,U=Y.y+K;let X={x:$,y:U,width:G.width||0,height:G.height||0};return Q.delete(J.id),W.absoluteGeometry.set(J.id,X),X}function V5(J,W){let Q=J.geometry;if(Q?.x===void 0||Q.y===void 0||Q.width===void 0||Q.height===void 0)return null;let G=SJ(J,W);if(!G)return null;return{...G,width:Q.width,height:Q.height}}function jJ(J){return{x:J.x+J.width/2,y:J.y+J.height/2}}function MJ(J,W){return J.x<W.x+W.width&&J.x+J.width>W.x&&J.y<W.y+W.height&&J.y+J.height>W.y}function U1(J,W){return J?.split(";").map((Q)=>Q.split("=",2)).find(([Q])=>Q===W)?.[1]}function t8(J,W){let Q=U1(J,W);if(Q===void 0)return;let G=Number(Q);return Number.isFinite(G)?G:void 0}function kG(J){let W=J.replace(/<br\s*\/?\s*>/gi,`
`).replace(/&#x0*a;|&#0*10;/gi,`
`).replace(/<[^>]+>/g,"").replace(/&nbsp;|&#0*160;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').trim();return W?W.split(/\r?\n/):[]}function SG(J,W,Q){let G=kG(J);if(G.length===0)return null;let z=(K)=>Array.from(K).reduce(($,U)=>{if(/\s/u.test(U))return $+Q*0.35;if(/[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/u.test(U))return $+Q;if(/[A-Z0-9]/u.test(U))return $+Q*0.65;if(/[a-z]/u.test(U))return $+Q*0.55;return $+Q*0.45},0),Y=Math.max(8,...G.map(z))+8,Z=Math.max(Q*1.25,G.length*Q*1.25)+4;return{x:W.x-Y/2,y:W.y-Z/2,width:Y,height:Z}}function IG(J,W){let Q=J.slice(0,-1).map((Z,K)=>{let $=J[K+1];return{start:Z,end:$,length:Math.hypot($.x-Z.x,$.y-Z.y)}}).filter((Z)=>Z.length>0.000000001),G=Q.reduce((Z,K)=>Z+K.length,0);if(G<=0.000000001)return null;let z=Math.min(1,Math.max(0,W))*G;for(let Z of Q){if(z<=Z.length){let K=z/Z.length;return{point:{x:Z.start.x+(Z.end.x-Z.start.x)*K,y:Z.start.y+(Z.end.y-Z.start.y)*K},tangent:{x:(Z.end.x-Z.start.x)/Z.length,y:(Z.end.y-Z.start.y)/Z.length}}}z-=Z.length}let Y=Q[Q.length-1];return{point:{...Y.end},tangent:{x:(Y.end.x-Y.start.x)/Y.length,y:(Y.end.y-Y.start.y)/Y.length}}}function yG(J,W){if(!J.label?.trim())return null;let Q=Math.min(1,Math.max(-1,J.geometry?.x||0)),G=IG(W,(Q+1)/2);if(!G)return null;let z=J.geometry?.y||0,Y={x:G.point.x-G.tangent.y*z+(J.geometry?.offset?.x||0),y:G.point.y+G.tangent.x*z+(J.geometry?.offset?.y||0)};return SG(J.label,Y,t8(J.style,"fontSize")||12)}function bG(J,W){if(!J.label?.trim())return null;let Q=V5(J,W);if(!Q)return null;if(!J.style?.split(";").includes("swimlane"))return Q;let G=Math.max(0,t8(J.style,"startSize")||23);if(U1(J.style,"horizontal")==="0")return{...Q,width:Math.min(Q.width,G)};return{...Q,height:Math.min(Q.height,G)}}function Z1(J,W,Q){let G=J.source?W.get(J.source):void 0,z=J.target?W.get(J.target):void 0,Y=G?V5(G,Q):null,Z=z?V5(z,Q):null;if(!Y||!Z)return null;let K=jJ(Y),$=jJ(Z),U=(B,P,j,O)=>{let M=t8(J.style,j),R=t8(J.style,O);if(M!==void 0||R!==void 0)return{x:B.x+(M??0.5)*B.width,y:B.y+(R??0.5)*B.height};let E=jJ(B),A=P.x-E.x,N=P.y-E.y;if(Math.abs(A)>=Math.abs(N))return{x:A>=0?B.x+B.width:B.x,y:E.y};return{x:E.x,y:N>=0?B.y+B.height:B.y}},X=U(Y,$,"exitX","exitY"),H=U(Z,K,"entryX","entryY"),F=J.parent?Q.cellsById.get(J.parent):void 0,q=F?SJ(F,Q):null,L=(J.geometry?.points||[]).map((B)=>({x:B.x+(q?.x||0),y:B.y+(q?.y||0)}));if(L.length>0)return[X,...L,H];if(J.style?.includes("edgeStyle=none"))return[X,H];if(Math.abs(H.x-X.x)>=Math.abs(H.y-X.y)){let B=(X.x+H.x)/2;return[X,{x:B,y:X.y},{x:B,y:H.y},H]}let V=(X.y+H.y)/2;return[X,{x:X.x,y:V},{x:H.x,y:V},H]}function g9(J,W){let Q=new Set,G=J?W.cellsById.get(J):void 0;while(G?.parent&&!Q.has(G.parent))Q.add(G.parent),G=W.cellsById.get(G.parent);return Q}function fG(J,W,Q,G){let z=(W.x-J.x)*(G.y-Q.y)-(W.y-J.y)*(G.x-Q.x);if(Math.abs(z)<0.000000001)return!1;let Y=((Q.x-J.x)*(G.y-Q.y)-(Q.y-J.y)*(G.x-Q.x))/z,Z=((Q.x-J.x)*(W.y-J.y)-(Q.y-J.y)*(W.x-J.x))/z,K=0.000001;return Y>K&&Y<1-K&&Z>K&&Z<1-K}function vG(J,W,Q){let z=Q.x+0.0001,Y=Q.x+Q.width-0.0001,Z=Q.y+0.0001,K=Q.y+Q.height-0.0001;if(z>=Y||Z>=K)return!1;let $=W.x-J.x,U=W.y-J.y,X=[-$,$,-U,U],H=[J.x-z,Y-J.x,J.y-Z,K-J.y],F=0,q=1;for(let L=0;L<X.length;L+=1){if(Math.abs(X[L])<0.000000001){if(H[L]<0)return!1;continue}let V=H[L]/X[L];if(X[L]<0)F=Math.max(F,V);else q=Math.min(q,V);if(F>q)return!1}return q-F>0.0001}function m8(J,W=90){let Q=l(J),G=Q.errors.map((Z)=>({code:"invalid-structure",severity:"error",page:Z.split(":")[0]||"(unknown)",cells:[],message:Z})),z={overlaps:0,edgeNodeIntersections:0,edgeCrossings:0,labelOverlaps:0,emptyLabels:0,missingLineJumps:0};for(let Z of J){let K=Z.cells.filter((V)=>V.vertex),$=Z.cells.filter((V)=>V.edge),U=new Map(K.map((V)=>[V.id,V])),X=S6(Z.cells),H=new Set(Z.cells.map((V)=>V.parent).filter((V)=>Boolean(V)));for(let V=0;V<K.length;V+=1){let B=K[V],P=V5(B,X);if(!B.label?.trim()&&!H.has(B.id))z.emptyLabels+=1,G.push({code:"empty-label",severity:"warning",page:Z.name,cells:[B.id],message:`${Z.name}: node ${B.id} has an empty label`});if(!P)continue;for(let j=V+1;j<K.length;j+=1){let O=K[j];if(B.parent!==O.parent)continue;let M=V5(O,X);if(!M||!MJ(P,M))continue;z.overlaps+=1,G.push({code:"node-overlap",severity:"error",page:Z.name,cells:[B.id,O.id],message:`${Z.name}: nodes ${B.id} and ${O.id} overlap`})}}let F=new Map,q=new Map;for(let V of $){let B=Z1(V,U,X);if(B){F.set(V.id,B);let j=yG(V,B);if(j)q.set(V.id,j)}if(!V.style?.includes("jumpStyle=arc"))z.missingLineJumps+=1,G.push({code:"missing-line-jump",severity:"info",page:Z.name,cells:[V.id],message:`${Z.name}: edge ${V.id} does not enable arc line jumps`});if(!B)continue;let P=new Set([...g9(V.source,X),...g9(V.target,X)]);for(let j of K){if(j.id===V.source||j.id===V.target)continue;if(P.has(j.id))continue;let O=V5(j,X);if(!O)continue;if(!B.slice(0,-1).some((R,E)=>vG(R,B[E+1],O)))continue;z.edgeNodeIntersections+=1,G.push({code:"edge-through-node",severity:"error",page:Z.name,cells:[V.id,j.id],message:`${Z.name}: edge ${V.id} passes through node ${j.id}`})}}for(let V of $){let B=q.get(V.id);if(!B)continue;for(let P of K){let j=bG(P,X);if(!j||!MJ(B,j))continue;z.labelOverlaps+=1,G.push({code:"label-overlap",severity:"error",page:Z.name,cells:[V.id,P.id],message:`${Z.name}: label of edge ${V.id} overlaps node or container title ${P.id}`})}}let L=$.filter((V)=>q.has(V.id));for(let V=0;V<L.length;V+=1){let B=L[V],P=q.get(B.id);for(let j=V+1;j<L.length;j+=1){let O=L[j],M=q.get(O.id);if(!MJ(P,M))continue;z.labelOverlaps+=1,G.push({code:"label-overlap",severity:"error",page:Z.name,cells:[B.id,O.id],message:`${Z.name}: labels of edges ${B.id} and ${O.id} overlap`})}}for(let V=0;V<$.length;V+=1){let B=$[V],P=F.get(B.id);if(!P)continue;for(let j=V+1;j<$.length;j+=1){let O=$[j];if(B.source===O.source||B.source===O.target||B.target===O.source||B.target===O.target)continue;let M=F.get(O.id);if(!M)continue;if(!P.slice(0,-1).some((E,A)=>M.slice(0,-1).some((N,D)=>fG(E,P[A+1],N,M[D+1]))))continue;z.edgeCrossings+=1,G.push({code:"edge-crossing",severity:"warning",page:Z.name,cells:[B.id,O.id],message:`${Z.name}: edges ${B.id} and ${O.id} cross`})}}}let Y=Math.max(0,100-Q.errors.length*40-z.overlaps*12-z.edgeNodeIntersections*8-z.edgeCrossings*4-z.labelOverlaps*6-z.emptyLabels*2-z.missingLineJumps);return{pass:Q.valid&&z.overlaps===0&&z.edgeNodeIntersections===0&&z.labelOverlaps===0&&Y>=W,score:Y,threshold:W,metrics:z,issues:G,validation:Q}}function _G(J,W){let Q=new Map,G=[];for(let z of J.split(";").filter(Boolean)){let Y=z.indexOf("="),Z=Y===-1?z:z.slice(0,Y);if(!Q.has(Z))G.push(Z);Q.set(Z,Y===-1?"":z.slice(Y+1))}for(let[z,Y]of Object.entries(W)){if(!Q.has(z))G.push(z);Q.set(z,Y)}return`${G.map((z)=>{let Y=Q.get(z)||"";return Y?`${z}=${Y}`:z}).join(";")};`}function xG(J,W){let Q=F6(J),G=Q.filter(m5),z=G.filter((j)=>S(j["@_parent"])==="1"),Y=z.length>0?z:G,Z=new Set(Y.map(Z5)),K=Q.filter((j)=>i8(j)&&Z.has(S(j["@_source"])||"")&&Z.has(S(j["@_target"])||""));if(Y.length===0)return[];let $=Y.map((j)=>({id:Z5(j),label:S(j["@_value"])||Z5(j)})),U=K.map((j)=>({id:Z5(j),source:S(j["@_source"])||"",target:S(j["@_target"])||""})),X=z1($,U),H=new Map;for(let j of Y){let O=X.get(Z5(j))||0,M=H.get(O)||[];M.push(j),H.set(O,M)}for(let j of H.values())j.sort((O,M)=>{let R=p5(O),E=p5(M),A=e(R[W==="left-to-right"?"@_y":"@_x"])||0,N=e(E[W==="left-to-right"?"@_y":"@_x"])||0;return A-N||Z5(O).localeCompare(Z5(M))});let F=Math.max(...Y.map((j)=>e(p5(j)["@_width"])||160)),q=Math.max(...Y.map((j)=>e(p5(j)["@_height"])||70)),L=F+140,V=q+90,B=new Map,P=new Set;for(let[j,O]of[...H.entries()].sort((M,R)=>M[0]-R[0]))O.forEach((M,R)=>{let E=p5(M),A=e(E["@_width"])||160,N=e(E["@_height"])||70,D={x:W==="left-to-right"?80+j*L:80+R*V,y:W==="left-to-right"?80+R*V:80+j*L,width:A,height:N};E["@_x"]=D.x,E["@_y"]=D.y,E["@_width"]=A,E["@_height"]=N,B.set(Z5(M),D),P.add(Z5(M))});for(let[j,O]of K.entries()){let M=S(O["@_source"]),R=S(O["@_target"]),E=B.get(M),A=B.get(R),N=K.filter((y)=>S(y["@_source"])===M),C=(N.indexOf(O)-(N.length-1)/2)*18,T=p5(O);T["@_relative"]="1",T["@_as"]="geometry";let v,i;if(W==="left-to-right"){let y=E.x+E.width,n=A.x,u=n>y?(y+n)/2+C:Math.max(y,A.x+A.width)+80+j*18;v=[{x:u,y:E.y+E.height/2},{x:u,y:A.y+A.height/2}],i={exitX:"1",exitY:"0.5",exitDx:"0",exitDy:"0",entryX:"0",entryY:"0.5",entryDx:"0",entryDy:"0"}}else{let y=E.y+E.height,n=A.y,u=n>y?(y+n)/2+C:Math.max(y,A.y+A.height)+80+j*18;v=[{x:E.x+E.width/2,y:u},{x:A.x+A.width/2,y:u}],i={exitX:"0.5",exitY:"1",exitDx:"0",exitDy:"0",entryX:"0.5",entryY:"0",entryDx:"0",entryDy:"0"}}T.Array={"@_as":"points",mxPoint:v.map((y)=>({"@_x":y.x,"@_y":y.y}))},O["@_style"]=_G(S(O["@_style"])||kJ,{edgeStyle:"orthogonalEdgeStyle",rounded:"1",orthogonalLoop:"1",jettySize:"auto",html:"1",jumpStyle:"arc",jumpSize:"10",endArrow:"block",endFill:"1",...i}),P.add(Z5(O))}return[...P]}async function n8(J,W,Q){await I.mkdir(w.dirname(J),{recursive:!0});let G=!1;try{G=(await I.stat(J)).isFile()}catch(Z){if(Z.code!=="ENOENT")throw Z}if(G&&!Q)throw Error("target already exists; set overwrite=true to replace it with a recoverable backup");let z=`${J}.${process.pid}.${Date.now()}.tmp`;if(await I.writeFile(z,W,"utf8"),!G)return await I.rename(z,J),{backup:null};let Y=`${J}.${new Date().toISOString().replace(/[:.]/g,"-")}.bak`;await I.rename(J,Y);try{await I.rename(z,J)}catch(Z){throw await I.rename(Y,J),Z}return{backup:Y}}var K1=new Set(["svg","xmlsvg","html2"]),X1=new Set(["png","jpeg","xmlpng"]),F1=new Set(["svg","xmlsvg"]),PJ=/^[A-Za-z0-9._:-]{1,120}$/;function hG(J,W,Q){let G=Q0("sha256").update(J).digest("hex").slice(0,12),z=`export-page-${W+1}-${G}`,Y=z,Z=2;while(Q.has(Y))Y=`${z}-${Z}`,Z+=1;return Q.add(Y),Y}function uG(J,W){let Q=K6.parse(J),G=Q.mxfile;if(!G)return{xml:J,pageId:W};let z=_5(G.diagram),Y=new Set(z.map((U)=>S(U["@_id"])).filter((U)=>Boolean(U)&&PJ.test(U))),Z=new Map,K=!1;z.forEach((U,X)=>{let H=S(U["@_id"]);if(!H||PJ.test(H))return;let F=hG(H,X,Y);if(U["@_id"]=F,!Z.has(H))Z.set(H,F);K=!0});let $=W;if(W&&!PJ.test(W)){if($=Z.get(W),!$)throw Error(`requested page ID ${JSON.stringify(W)} was not found in the Draw.io document`)}return{xml:K?D6.build(Q):J,pageId:$}}function c9(J,W){let Q=process.env[J]?.trim();if(!Q)return W;let G=Number(Q);if(!Number.isFinite(G)||G<=0)throw Error(`${J} must be a positive number`);return G}function W0(){let J=process.env.DRAWIO_EXPORT_URL?.trim()||HG,W=new URL(J);if(!["http:","https:"].includes(W.protocol))throw Error("DRAWIO_EXPORT_URL must use http or https");return{url:W,timeoutMs:c9("DRAWIO_REQUEST_TIMEOUT",60)*1000,maxOutputBytes:c9("DRAWIO_MAX_OUTPUT_SIZE_MB",FG/1024/1024)*1024*1024}}function H1(J){if(J==="jpeg")return".jpeg";if(J==="xmlpng")return".editable.png";if(J==="xmlsvg")return".editable.svg";if(J==="html2")return".html";return`.${J}`}function $1(J){if(J==="xmlpng")return[".editable.png",".png"];if(J==="xmlsvg")return[".editable.svg",".svg"];return[H1(J)]}function IJ(J,W,Q,G){let z=y6(J),Y=Q?.trim()||h(J,W).replace(/\.(?:drawio|xml)$/i,H1(G)),Z=a8(J,Y,$1(G)),K=w.relative(z,Z);if(!K||w.isAbsolute(K))throw Error("output file must resolve inside the current workspace");return Z}function q1(J,W,Q,G,z){let Y=IJ(J,W,Q,G),Z=[...$1(G)].sort(($,U)=>U.length-$.length).find(($)=>Y.toLowerCase().endsWith($));if(!Z)throw Error(`cannot derive a multi-page output name for ${G}`);let K=Y.slice(0,-Z.length);return z.map(($,U)=>({page:$,pageIndex:U+1,outputTarget:`${K}.page-${U+1}-${e9($.name)}${Z}`}))}function V1(J,W){let Q=f(J).find((G)=>G.id===W);if(!Q)throw Error(`requested page ID ${JSON.stringify(W)} was not found in the Draw.io document`);return Q}function gG(J,W){V1(J,W);let Q=K6.parse(J),G=Q.mxfile;if(!G)throw Error("Draw.io document is missing mxfile");let Y=_5(G.diagram).find((Z)=>S(Z["@_id"])===W);if(!Y)throw Error(`requested page ID ${JSON.stringify(W)} was not found in the Draw.io document`);return G.diagram=Y,D6.build(Q)}function cG(J,W,Q){if(J.length===0)throw Error("export server returned an empty response");if(!{png:["image/png","application/octet-stream"],jpeg:["image/jpeg","application/octet-stream"],pdf:["application/pdf","application/octet-stream"],xmlpng:["image/png","image/jpg","application/octet-stream"],svg:["image/svg+xml","text/plain","application/octet-stream"],xmlsvg:["image/svg+xml","text/plain","application/octet-stream"],html2:["text/html","text/plain","application/octet-stream"]}[W].some((Y)=>Q.includes(Y)))throw Error(`export server returned unexpected Content-Type: ${Q||"(missing)"}`);if(!(W==="png"||W==="xmlpng"?J.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):W==="jpeg"?J.subarray(0,3).equals(Buffer.from([255,216,255])):W==="pdf"?J.subarray(0,5).toString("ascii")==="%PDF-":!0))throw Error(`export server response is not a valid ${W.toUpperCase()} file`)}function mG(J){if(typeof J!=="string")throw Error("editor export data must be a data URI string");let W=J.match(/^data:([^;,]+)?((?:;[^,]*)*),(.*)$/s);if(!W)throw Error("editor returned an invalid data URI");return W[2].split(";").includes("base64")?Buffer.from(W[3],"base64"):Buffer.from(decodeURIComponent(W[3]),"utf8")}function pG(J,W){if(J.length===0)throw Error("editor export returned empty content");if(W!=="svg"&&W!=="xmlsvg"&&W!=="html2")throw Error(`${W} is not an editor-channel export format`);let Q=J.subarray(0,4096).toString("utf8");if(W==="svg"||W==="xmlsvg"){if(!Q.includes("<svg"))throw Error(`editor export is not valid ${W.toUpperCase()} content`)}else{let G=Q.toLowerCase();if(!G.includes("<html")&&!G.includes("<!doctype"))throw Error("editor export is not valid HTML content")}}function dG(J){if(J==="svg"||J==="xmlsvg")return"image/svg+xml";if(J==="html2")return"text/html";return"application/octet-stream"}async function Y0(J,W,Q={}){let G=W0(),z=uG(J,Q.pageId),Y=new URLSearchParams({format:W==="xmlpng"?"png":W,xml:z.xml});if(z.pageId&&!Q.allPages)Y.set("pageId",z.pageId);if(Q.allPages)Y.set("allPages","1");if(Q.scale!==void 0&&Q.scale!==1)Y.set("scale",String(Q.scale));if(Q.border!==void 0&&Q.border!==0)Y.set("border",String(Q.border));if(Y.set("bg",Q.background?.trim()||RJ),Q.embedXml)Y.set("embedXml","1");let Z;try{Z=await fetch(G.url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},body:Y,redirect:"follow",signal:AbortSignal.timeout(G.timeoutMs)})}catch(U){throw Error(`cannot reach Draw.io Export Server at ${G.url}: ${U.message}`)}if(!Z.ok){let U="";try{U=(await Z.text()).trim().slice(0,500)}catch(X){U=`response body unavailable: ${X.message}`}throw Error(`Draw.io Export Server returned HTTP ${Z.status}${U?`: ${U}`:""}`)}let K;try{K=Buffer.from(await Z.arrayBuffer())}catch(U){throw Error(`Draw.io Export Server closed the HTTP ${Z.status} response before the export completed: ${U.message}`)}if(K.length>G.maxOutputBytes)throw Error(`export result exceeds ${Math.floor(G.maxOutputBytes/1024/1024)} MB`);let $=Z.headers.get("content-type")?.toLowerCase()||"";return cG(K,W,$),{content:K,contentType:$,exportUrl:G.url.toString()}}async function yJ(J,W,Q){await I.mkdir(w.dirname(J),{recursive:!0});let G=!1;try{G=(await I.stat(J)).isFile()}catch(Y){if(Y.code!=="ENOENT")throw Y}if(G&&!Q)throw Error("output already exists; set overwrite=true to replace it");let z=`${J}.${process.pid}.${Date.now()}.tmp`;if(await I.writeFile(z,W),G)await I.rm(J);await I.rename(z,J)}async function lG(J,W){if(new Set(J.map((z)=>w.resolve(z.target))).size!==J.length)throw Error("multi-page export resolved duplicate output paths");let G=[];try{for(let[Y,Z]of J.entries()){await I.mkdir(w.dirname(Z.target),{recursive:!0});let K=!1;try{K=(await I.stat(Z.target)).isFile()}catch(X){if(X.code!=="ENOENT")throw X}if(K&&!W)throw Error(`output already exists: ${Z.target}; set overwrite=true to replace it`);let $=`${process.pid}.${Date.now()}.${Y}.${a9()}`,U=`${Z.target}.${$}.tmp`;await I.writeFile(U,Z.content),G.push({target:Z.target,temporary:U,backup:K?`${Z.target}.${$}.previous`:null,existed:K})}let z=[];try{for(let Y of G){if(Y.existed&&Y.backup)await I.rename(Y.target,Y.backup);try{await I.rename(Y.temporary,Y.target),z.push(Y)}catch(Z){if(Y.existed&&Y.backup)await I.rename(Y.backup,Y.target);throw Z}}}catch(Y){for(let Z of z.reverse())if(await I.rm(Z.target,{force:!0}),Z.existed&&Z.backup)await I.rename(Z.backup,Z.target);throw Y}for(let Y of G)if(Y.backup)await I.rm(Y.backup,{force:!0})}finally{for(let z of G)if(await I.rm(z.temporary,{force:!0}),z.backup)try{await I.access(z.target)}catch{try{await I.rename(z.backup,z.target)}catch{}}}}async function m9(J){let W=IJ(J.context,J.inputTarget,J.outputPath,J.format),Q=await Y0(J.xml,J.format,{pageId:J.pageId,allPages:J.allPages,scale:J.scale,border:J.border,background:J.background,embedXml:J.embedXml});return await yJ(W,Q.content,J.overwrite),{outputTarget:W,bytes:Q.content.length,contentType:Q.contentType,exportUrl:Q.exportUrl}}async function iG(J){if(!X1.has(J.format))throw Error(`${J.format} is not a per-page multi-file export format`);let W=f(J.xml),Q=q1(J.context,J.inputTarget,J.outputPath,J.format,W);if(!J.overwrite)for(let z of Q)try{if((await I.stat(z.outputTarget)).isFile())throw Error(`output already exists: ${h(J.context,z.outputTarget)}; set overwrite=true to replace it`)}catch(Y){if(Y.code!=="ENOENT")throw Y}let G=[];for(let z of Q){let Y=await Y0(J.xml,J.format,{pageId:z.page.id,scale:J.scale,border:J.border,background:J.background,embedXml:J.embedXml});G.push({...z,...Y})}for(let z of G)await yJ(z.outputTarget,z.content,J.overwrite);return G.map((z)=>({pageId:z.page.id,pageName:z.page.name,pageIndex:z.pageIndex,outputTarget:z.outputTarget,bytes:z.content.length,contentType:z.contentType,exportUrl:z.exportUrl}))}async function nG(J,W,Q){let G=Date.now();while(Date.now()-G<Q){if(e8(J,W))return!0;await new Promise((z)=>setTimeout(z,500))}return e8(J,W)}async function L1(J){if(!K1.has(J.format))throw Error(`${J.format} is not an editor-channel export format`);let W=await DJ(J.context,J.inputTarget),Q=IJ(J.context,J.inputTarget,J.outputPath,J.format);if(!await nG(W.session.sessionId,J.inputTarget,$G)){let K=new URL("/editor",`http://${W.bridge.host}:${W.bridge.port}`);return K.searchParams.set("sessionId",W.session.sessionId),K.searchParams.set("token",W.token),{status:"editor_required",openUrl:K.toString(),tokenExpiresAt:new Date(Date.now()+H8).toISOString()}}let z=b(),Y=`export_${a9()}`,Z=W0().timeoutMs;return await new Promise((K,$)=>{let U=setTimeout(()=>{z.pendingEditorExports.delete(Y),$(Error(`editor export timed out after ${Math.round(Z/1000)}s; make sure the built-in browser editor page is open and responsive, then retry`))},Z);z.pendingEditorExports.set(Y,{requestId:Y,sessionId:W.session.sessionId,diagramKey:g(W.session.file),format:J.format,outputTarget:Q,overwrite:J.overwrite,writeOutput:J.writeOutput!==!1,resolve:(X)=>K({status:"exported",...X,sourceRevision:J.sourceRevision}),reject:$,timer:U}),Q3(W.session,{action:"export",requestId:Y,format:J.format,pageId:J.pageId,allPages:J.allPages===!0,xml:J.xml,sourceRevision:J.sourceRevision})})}async function rG(J){if(!F1.has(J.format))throw Error(`${J.format} is not an editor per-page multi-file export format`);let W=f(J.xml),Q=q1(J.context,J.inputTarget,J.outputPath,J.format,W);if(!J.overwrite)for(let z of Q)try{if((await I.stat(z.outputTarget)).isFile())throw Error(`output already exists: ${h(J.context,z.outputTarget)}; set overwrite=true to replace it`)}catch(Y){if(Y.code!=="ENOENT")throw Y}let G=[];for(let z of Q){let Y=await L1({context:J.context,inputTarget:J.inputTarget,format:J.format,outputPath:h(J.context,z.outputTarget),xml:J.xml,pageId:z.page.id,sourceRevision:J.sourceRevision,writeOutput:!1,overwrite:J.overwrite});if(Y.status==="editor_required")return Y;if(!Y.content)throw Error("editor export completed without buffered content");G.push({...z,content:Y.content,contentType:Y.contentType})}return await lG(G.map((z)=>({target:z.outputTarget,content:z.content})),J.overwrite),{status:"exported",sourceRevision:J.sourceRevision,outputs:G.map((z)=>({pageId:z.page.id,pageName:z.page.name,pageIndex:z.pageIndex,outputTarget:z.outputTarget,bytes:z.content.length,contentType:z.contentType}))}}async function oG(){let J=W0(),W=Number(J.url.port||(J.url.protocol==="https:"?443:80));return new Promise((Q)=>{let G=XG({host:J.url.hostname,port:W}),z=setTimeout(()=>{G.destroy(),Q({reachable:!1,error:"connection timed out"})},Math.min(J.timeoutMs,5000));G.once("connect",()=>{clearTimeout(z),G.end(),Q({reachable:!0})}),G.once("error",(Y)=>{clearTimeout(z),Q({reachable:!1,error:Y.message})})})}async function aG(J){let W=[],Q=0;for await(let G of J){let z=Buffer.isBuffer(G)?G:Buffer.from(G);if(Q+=z.length,Q>X6)throw Error(`request body exceeds ${X6/1024/1024} MB`);W.push(z)}return Buffer.concat(W).toString("utf8")}async function B1(J,W){let Q=`${J}.${process.pid}.${Date.now()}.tmp`,G=`${J}.${process.pid}.${Date.now()}.rollback`;await I.writeFile(Q,W,"utf8"),await I.rename(J,G);try{await I.rename(Q,J),await I.rm(G,{force:!0})}catch(z){throw await I.rm(J,{force:!0}),await I.rename(G,J),z}}function sG(J,W){let Q;try{Q=new URL(J)}catch{throw Error(`${W} must be an absolute http:// or https:// URL`)}if(!["http:","https:"].includes(Q.protocol)||Q.username||Q.password)throw Error(`${W} must be an http:// or https:// URL without credentials`);return Q.hash="",Q}function wJ(J){let W=sG(J,"drawio_url");if(W.searchParams.set("embed","1"),W.searchParams.set("proto","json"),W.searchParams.set("spin","1"),W.searchParams.set("libraries","1"),W.searchParams.set("saveAndExit","0"),W.searchParams.set("noSaveBtn","0"),W.searchParams.set("offline","1"),W.protocol==="http:")W.searchParams.set("https","0");return W}function tG(J){return JSON.stringify(J).replace(/[<>&\u2028\u2029]/g,(W)=>{return`\\u${W.charCodeAt(0).toString(16).padStart(4,"0")}`})}var q5=globalThis;function b(){if(!q5.__drawioIntegratedBridge)q5.__drawioIntegratedBridge={server:null,startPromise:null,host:"127.0.0.1",port:0,sessions:new Map,tokens:new Map,eventClients:new Map,pendingEditorExports:new Map,writeQueues:new Map,annotationWriteQueues:new Map,annotationsByDiagram:new Map,historyWriteQueues:new Map,historyDebounce:new Map,previewInFlight:new Map,previewActive:0,previewWaiters:[],patchPreviews:new Map};return q5.__drawioIntegratedBridge.writeQueues||=new Map,q5.__drawioIntegratedBridge.pendingEditorExports||=new Map,q5.__drawioIntegratedBridge.annotationWriteQueues||=new Map,q5.__drawioIntegratedBridge.annotationsByDiagram||=new Map,q5.__drawioIntegratedBridge.historyWriteQueues||=new Map,q5.__drawioIntegratedBridge.historyDebounce||=new Map,q5.__drawioIntegratedBridge.previewInFlight||=new Map,q5.__drawioIntegratedBridge.previewActive||=0,q5.__drawioIntegratedBridge.previewWaiters||=[],q5.__drawioIntegratedBridge.patchPreviews||=new Map,q5.__drawioIntegratedBridge}function a(J){return Q0("sha256").update(J,"utf8").digest("hex")}function J5(J){return typeof J==="object"&&J!==null&&!Array.isArray(J)}function eG(J){return J==="editor"?"editor":"agent"}function bJ(J){if(J==="selection_and_edges"||J==="surrounding_layout"||J==="diagram_wide")return J;return"selection_only"}function I5(J){if(J==="diagram_wide")return"\u5141\u8BB8\u4FEE\u6539\u6574\u4E2A\u56FE\u8868";if(J==="selection_and_edges")return"\u5141\u8BB8\u8C03\u6574\u5173\u8054\u8FDE\u7EBF";if(J==="surrounding_layout")return"\u5141\u8BB8\u8C03\u6574\u5468\u8FB9\u5E03\u5C40";return"\u53EA\u4FEE\u6539\u9009\u533A"}function p9(J){if(J==="diagram_wide")return 3;if(J==="selection_and_edges")return 1;if(J==="surrounding_layout")return 2;return 0}function fJ(J){if(J.history.push({revision:J.revision,xml:J.xml,updatedBy:J.updatedBy,updatedAt:J.updatedAt}),J.history.length>v9)J.history.splice(0,J.history.length-v9)}function r8(J,W){let Q=J.history.find((G)=>G.revision===W);if(!Q)return{available:!1,reason:"base revision is no longer in the in-memory history"};try{return{available:!0,fromRevision:W,toRevision:J.revision,diff:w6(f(Q.xml),f(J.xml))}}catch(G){return{available:!1,reason:`unable to calculate revision diff: ${G.message}`}}}async function c(J){let W=await C5(J.file),Q=a(W);if(Q===J.fileHash)return J;let G=f(W),z=l(G);if(!z.valid)throw Error(`workspace file changed to invalid Draw.io XML: ${JSON.stringify(z.errors)}`);return fJ(J),J.revision+=1,J.xml=W,J.fileHash=Q,J.updatedBy="external",J.updatedAt=new Date().toISOString(),uJ(J.file,null),vJ(J),await x5(J,{source:"external",xml:W,sessionRevision:J.revision}),J}function k5(J,W){let Q=J.sessionID?.trim();if(!Q)return null;let G=b().sessions.get(Q);if(!G||w.resolve(G.file)!==w.resolve(W))return null;return G}function p8(J,W){if(W?.trim())return k5(J,P5(J,W));return b().sessions.get(J.sessionID)||null}async function F8(J,W,Q,G,z=null,Y={}){let Z=b(),K=w.resolve(J.file).toLowerCase(),U=(Z.writeQueues.get(K)||Promise.resolve()).catch(()=>{return}).then(async()=>{let X=W,H=null;if(await c(J),Q!==J.revision){let L=r8(J,Q);if(Y.autoMerge){let V=J.history.find((P)=>P.revision===Q),B=V?wG(V.xml,W,J.xml):{status:"unavailable",reason:"base revision is no longer in memory"};if(B.status==="merged"){if(X=B.xml,H={status:"merged",fromRevision:Q,ontoRevision:J.revision,localChangedKeys:B.localChangedKeys,remoteChangedKeys:B.remoteChangedKeys},B.localChangedKeys.length===0||a(X)===J.fileHash)return{conflict:!1,document:J,validation:l(f(J.xml)),autoMerge:H}}else return{conflict:!0,current:J,manualChanges:L,merge:B}}else return{conflict:!0,current:J,manualChanges:L,merge:null}}let F=f(X),q=l(F);if(!q.valid)return{invalid:!0,report:q};if(fJ(J),!J.backupFile){let L=await n8(J.file,X,!0);J.backupFile=L.backup}else await B1(J.file,X);if(J.revision+=1,J.xml=X,J.fileHash=a(X),J.updatedBy=G,J.updatedAt=new Date().toISOString(),uJ(J.file,Y.appliedPreviewId||null),vJ(J,z),G==="agent")try{await x5(J,{source:"agent",xml:X,sessionRevision:J.revision})}catch(L){console.warn(`history snapshot record failed for ${J.file}: ${L.message}`)}else H3(J);return{conflict:!1,document:J,validation:q,autoMerge:H}});return Z.writeQueues.set(K,U),U.catch(()=>{return}).finally(()=>{if(Z.writeQueues.get(K)===U)Z.writeQueues.delete(K)}),U}function J3(J){let Q=new URL(J.url||"/",`http://${J.headers.host||"localhost"}`).searchParams.get("token")||"",G=b().tokens.get(Q);if(!G||G.expiresAt<=Date.now())return b().tokens.delete(Q),null;let z=b().sessions.get(G.sessionId);if(!z)return null;if(g(z.file)!==G.diagramKey)return null;if(z.bindingId!==G.bindingId)return null;return G.expiresAt=Date.now()+H8,{sessionKey:Q,session:z}}function k(J,W,Q){J.writeHead(W,{"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"}),J.end(JSON.stringify(Q))}async function X8(J){let W=await aG(J),Q=JSON.parse(W);if(!J5(Q))throw Error("request body must be a JSON object");return Q}function K5(J){return{sessionId:J.sessionId,file:w.relative(J.workspace,J.file).split(w.sep).join("/"),revision:J.revision,xml:J.xml,updatedBy:J.updatedBy,updatedAt:J.updatedAt,backup:J.backupFile?w.relative(J.workspace,J.backupFile).split(w.sep).join("/"):null}}function vJ(J,W=null){let Q=`event: diagram\\ndata: ${JSON.stringify({revision:J.revision,updatedBy:J.updatedBy,updatedAt:J.updatedAt,clientId:W})}

`,G=g(J.file);for(let z of b().eventClients.get(J.sessionId)||[])if(z.diagramKey===G)z.response.write(Q)}function e8(J,W){let Q=g(W);return[...b().eventClients.get(J)||[]].some((G)=>G.diagramKey===Q)}function Q3(J,W){let Q=`event: editor-command
data: ${JSON.stringify(W)}

`,G=g(J.file);[...b().eventClients.get(J.sessionId)||[]].find((Y)=>Y.diagramKey===G)?.response.write(Q)}function d9(J){return w.join(J,".mobilework","drawio-history","v1")}function W3(J){return Q0("sha256").update(J.replace(/\\/g,"/"),"utf8").digest("hex").slice(0,12)}function A5(J){let W=w.relative(J.workspace,J.file).split(w.sep).join("/");return`${w.basename(J.file)}--${W3(W)}`}function G0(J,W){let Q=w.resolve(W),G=w.resolve(J);if(Q!==G&&!Q.startsWith(G+w.sep))throw Error("history path escapes the history directory");return Q}function n5(J){return G0(d9(J.workspace),w.join(d9(J.workspace),A5(J)))}function _J(J){return w.join(n5(J),"manifest.json")}function xJ(J,W){if(!$8.test(W))throw Error("invalid snapshot id");return G0(n5(J),w.join(n5(J),"snapshots",`${W}.drawio`))}function j1(J){let W=String(J).replace(/[^A-Za-z0-9_-]/g,"_").slice(0,120);if(!W)throw Error("invalid page id");return W}function M1(J,W,Q,G){if(!$8.test(W))throw Error("invalid snapshot id");let z=j1(Q),Y=G==="preview"?`${z}-preview.png`:`${z}-thumb.png`;return G0(n5(J),w.join(n5(J),"previews",W,Y))}function Y3(J){if(!J5(J))return!1;if(typeof J.id!=="string"||!$8.test(J.id))return!1;if(!Number.isInteger(J.sequence))return!1;if(typeof J.createdAt!=="string")return!1;if(!["initial","editor","agent","external","restore"].includes(J.source))return!1;if(J.sessionId!==null&&typeof J.sessionId!=="string")return!1;if(!Number.isInteger(J.sessionRevision))return!1;if(typeof J.contentHash!=="string")return!1;if(J.parentSnapshotId!==null&&typeof J.parentSnapshotId!=="string")return!1;if(J.restoredFromSnapshotId!==null&&typeof J.restoredFromSnapshotId!=="string")return!1;if(!Array.isArray(J.pages))return!1;for(let W of J.pages)if(!J5(W)||typeof W.id!=="string"||typeof W.name!=="string")return!1;if(!["pending","ready","failed","unavailable"].includes(J.previewState))return!1;return!0}function G3(J){if(!J5(J))return!1;if(J.schemaVersion!==t9)return!1;if(!J5(J.file))return!1;if(typeof J.file.relativePath!=="string"||typeof J.file.pathKey!=="string")return!1;if(!Number.isInteger(J.nextSequence)||J.nextSequence<1)return!1;if(!Array.isArray(J.entries))return!1;for(let W of J.entries)if(!Y3(W))return!1;return!0}async function r5(J){let W=_J(J),Q;try{Q=await I.readFile(W,"utf8")}catch(z){if(z.code==="ENOENT")return null;throw z}let G;try{G=JSON.parse(Q)}catch(z){throw Error(`history manifest for ${A5(J)} is corrupted: ${z.message}`)}if(!G3(G))throw Error(`history manifest for ${A5(J)} failed schema validation`);return G}async function P1(J,W){if(z0("manifest"))throw Error("injected history manifest write failure");let Q=_J(J);await I.mkdir(w.dirname(Q),{recursive:!0});let G=`${Q}.${process.pid}.${Date.now()}.tmp`;await I.writeFile(G,JSON.stringify(W,null,2),"utf8"),await I.rename(G,Q)}function z0(J){return globalThis.__drawioHistoryFaults?.[J]===!0}function z3(){return`h_${new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z")}_${i5(4).toString("hex")}`}function NJ(J){if(J==="editor"||J==="agent"||J==="external"||J==="initial"||J==="restore")return J;return"initial"}function J0(J,W,Q){let G=`event: history
data: ${JSON.stringify({kind:W,...Q})}

`,z=g(J.file);for(let Y of b().eventClients.get(J.sessionId)||[])if(Y.diagramKey===z)Y.response.write(G)}function O1(J){return w.resolve(n5(J)).toLowerCase()}function C1(J,W){let Q=b(),z=(Q.historyWriteQueues.get(J)||Promise.resolve()).catch(()=>{return}).then(W);return Q.historyWriteQueues.set(J,z),z.catch(()=>{return}).finally(()=>{if(Q.historyWriteQueues.get(J)===z)Q.historyWriteQueues.delete(J)}),z}async function U3(J,W){try{for(let Q of W){await I.rm(xJ(J,Q),{force:!0});let G=G0(n5(J),w.join(n5(J),"previews",Q));await I.rm(G,{recursive:!0,force:!0})}}catch(Q){console.warn(`history cleanup failed for ${A5(J)}: ${Q.message}`)}}function Z3(J){let W=[];while(J.entries.length>LG){let Q=J.entries.shift();if(Q)W.push(Q.id)}return W}async function x5(J,W){return C1(O1(J),async()=>{let Q=await r5(J)||{schemaVersion:t9,file:{relativePath:w.relative(J.workspace,J.file).split(w.sep).join("/"),pathKey:A5(J)},nextSequence:1,entries:[]},G=a(W.xml),z=f(W.xml).map((H)=>({id:H.id,name:H.name})),Y=Q.entries[Q.entries.length-1]||null;if(!W.force&&Y&&Y.contentHash===G)return{created:!1,snapshot:Y};let Z=z3(),K={id:Z,sequence:Q.nextSequence,createdAt:new Date().toISOString(),source:W.source,sessionId:W.sessionId??J.sessionId,sessionRevision:W.sessionRevision??J.revision,contentHash:G,parentSnapshotId:Y?Y.id:null,restoredFromSnapshotId:W.restoredFromSnapshotId??null,pages:z,previewState:"pending"},$=xJ(J,Z);if(z0("snapshotXml"))throw Error("injected snapshot xml write failure");await I.mkdir(w.dirname($),{recursive:!0});let U=`${$}.${process.pid}.${Date.now()}.tmp`;await I.writeFile(U,W.xml,"utf8"),await I.rename(U,$),Q.entries.push(K),Q.nextSequence+=1;let X=Z3(Q);if(await P1(J,Q),X.length>0)U3(J,X);if(z.length>0)F3(J,K.id,z[0].id,"thumb");for(let H of X)J0(J,"snapshot-evicted",{snapshotId:H});return J0(J,"snapshot-created",{snapshotId:K.id,sequence:K.sequence,source:K.source}),{created:!0,snapshot:K}})}async function l9(J,W,Q){await C1(O1(J),async()=>{let G=await r5(J);if(!G)return;let z=G.entries.find((Y)=>Y.id===W);if(!z)return;z.previewState=Q,await P1(J,G)})}async function hJ(J,W,Q){let G=await I.readFile(xJ(J,W),"utf8");if(Buffer.byteLength(G,"utf8")>X6)throw Error("snapshot exceeds the size limit");if(Q&&a(G)!==Q)throw Error("snapshot content hash mismatch");return G}async function K3(){let J=b();while(J.previewActive>=jG)await new Promise((W)=>J.previewWaiters.push(W));J.previewActive+=1}function X3(){let J=b();J.previewActive-=1;let W=J.previewWaiters.shift();if(W)W()}async function A1(J,W,Q,G){let z=b(),Y=`${W}|${j1(Q)}|${G}`,Z=z.previewInFlight.get(Y);if(Z)return Z;let K=(async()=>{await K3();try{let U=(await r5(J))?.entries.find((V)=>V.id===W);if(!U)throw Error("snapshot not found in preview");let X=await hJ(J,W,U.contentHash);if(!f(X).find((V)=>V.id===Q))throw Error("page not found in snapshot");let F=await Y0(X,"png",{pageId:Q,scale:G==="thumb"?MG:1,background:"#ffffff"});if(F.content.length>PG)throw Error("preview exceeds the size limit");let q=M1(J,W,Q,G);await I.mkdir(w.dirname(q),{recursive:!0});let L=`${q}.${process.pid}.${Date.now()}.tmp`;if(await I.writeFile(L,F.content),await I.rename(L,q),G==="thumb")await l9(J,W,"ready");return J0(J,"preview-ready",{snapshotId:W,pageId:Q,mode:G}),F.content}catch($){if(G==="thumb")await l9(J,W,"failed");throw J0(J,"preview-failed",{snapshotId:W,pageId:Q,mode:G,error:$.message}),$}finally{X3(),z.previewInFlight.delete(Y)}})();return z.previewInFlight.set(Y,K),K}function F3(J,W,Q,G){A1(J,W,Q,G).catch(()=>{return})}function H3(J){let W=b(),Q=A5(J),G=W.historyDebounce.get(Q);if(G)clearTimeout(G.timer);let z=setTimeout(()=>{R1(J.sessionId,Q).catch((Y)=>console.warn(`editor history checkpoint failed for ${J.file}: ${Y.message}`))},BG);if(typeof z.unref==="function")z.unref();W.historyDebounce.set(Q,{timer:z,sessionId:J.sessionId,revision:J.revision,hash:J.fileHash})}async function R1(J,W){let Q=b(),G=Q.historyDebounce.get(W);if(G)clearTimeout(G.timer),Q.historyDebounce.delete(W);if(!G)return;let z=Q.sessions.get(J);if(!z)return;if(z.revision!==G.revision||z.fileHash!==G.hash)return;await x5(z,{source:"editor",xml:z.xml,sessionRevision:G.revision})}async function T1(J){await R1(J.sessionId,A5(J))}async function E1(J){try{let W=_J(J),Q=new Date().toISOString().replace(/[:.]/g,"-");await I.rename(W,`${W}.corrupt-${Q}`),console.warn(`quarantined corrupt history manifest for ${A5(J)} to ${w.basename(W)}.corrupt-${Q}`)}catch(W){if(W.code!=="ENOENT")console.warn(`unable to quarantine corrupt history manifest for ${A5(J)}: ${W.message}`)}}async function $3(J){let W=await r5(J),Q=W&&W.entries.length>0?W.entries[W.entries.length-1]:null;if(!Q){await x5(J,{source:NJ(J.updatedBy),xml:J.xml,sessionRevision:J.revision});return}if(Q.contentHash!==J.fileHash)await x5(J,{source:NJ(J.updatedBy),xml:J.xml,sessionRevision:J.revision})}async function q3(J){let W=null;try{W=await r5(J)}catch(G){J.historyWarning=`history re-initialized: previous manifest was corrupted (${G.message})`,console.warn(`${J.historyWarning} for ${A5(J)}`),await E1(J);return}let Q=W&&W.entries.length>0?W.entries[W.entries.length-1]:null;try{if(!Q)await x5(J,{source:"initial",xml:J.xml,sessionRevision:J.revision});else if(Q.contentHash!==J.fileHash)await x5(J,{source:"external",xml:J.xml,sessionRevision:J.revision})}catch(G){J.historyWarning=`history disabled: ${G.message}`,console.warn(`${J.historyWarning} for ${A5(J)}`)}}async function V3(J,W,Q,G){let z=b(),Y=w.resolve(J.file).toLowerCase(),K=(z.writeQueues.get(Y)||Promise.resolve()).catch(()=>{return}).then(async()=>{if(await c(J),Q!==J.revision)return{conflict:!0,current:J};let $=await r5(J);if(!$)return{invalid:!0,error:"snapshot_not_found"};let U=$.entries.find((V)=>V.id===W);if(!U)return{invalid:!0,error:"snapshot_not_found"};if(z0("preRestoreCheckpoint"))return{checkpointFailed:!0,error:"injected pre-restore checkpoint failure"};try{await T1(J),await x5(J,{source:NJ(J.updatedBy),xml:J.xml,sessionRevision:J.revision})}catch(V){return{checkpointFailed:!0,error:`pre-restore checkpoint failed: ${V.message}`}}let X;try{X=await hJ(J,U.id,U.contentHash)}catch(V){if(V.code==="ENOENT")return{invalid:!0,error:"snapshot_not_found"};return{invalid:!0,error:`snapshot_damaged: ${V.message}`}}let H;try{H=l(f(X))}catch(V){return{invalid:!0,error:`snapshot_damaged: ${V.message}`}}if(!H.valid)return{invalid:!0,error:`snapshot_damaged: ${JSON.stringify(H.errors)}`};if(U.contentHash===J.fileHash)return{invalid:!0,error:"current_snapshot"};await B1(J.file,X),fJ(J),J.revision+=1,J.xml=X,J.fileHash=a(X),J.updatedBy="restore",J.updatedAt=new Date().toISOString(),uJ(J.file,null);let F=null;try{await L3(J)}catch(V){F=`diagram restored, but annotation invalidation could not be persisted: ${V.message}`,console.warn(F)}try{vJ(J,G)}catch(V){console.warn(`diagram revision broadcast failed: ${V.message}`)}let q=U.sequence,L;try{L=await x5(J,{source:"restore",xml:X,sessionRevision:J.revision,restoredFromSnapshotId:U.id,force:!0})}catch(V){return{partFailed:!0,document:J,message:F?`${F} restore snapshot also failed: ${V.message}`:`diagram restored, but the restore snapshot could not be recorded: ${V.message}`}}if(!L.created||!L.snapshot)return{partFailed:!0,document:J,message:F?F:"diagram restored, but the restore snapshot could not be recorded"};return{ok:!0,document:J,snapshot:L.snapshot,restoredFromSequence:q,annotationInvalidationWarning:F}});return z.writeQueues.set(Y,K),K.catch(()=>{return}).finally(()=>{if(z.writeQueues.get(Y)===K)z.writeQueues.delete(Y)}),K}async function L3(J){let W=g(J.file);for(let Q of b().sessions.values()){if(g(Q.file)!==W)continue;for(let G of Q.annotationAuthorizations.values()){if(!G.previewId)continue;let z=b().patchPreviews.get(G.previewId);if(z)U0(Q,z,"\u5173\u8054\u7684\u6807\u6CE8\u5BA1\u6279\u5DF2\u5931\u6548")}Q.annotationAuthorizations.clear(),Q.activeAnnotationId=null}}function w1(J){return`${J.file.replace(/\.(drawio|xml)$/i,"")}.annotations.json`}function g(J){let W=w.resolve(J);return process.platform==="win32"?W.toLowerCase():W}function X5(J){let W=b(),Q=g(J.file),G=W.annotationsByDiagram.get(Q);if(!G)G=new Map,W.annotationsByDiagram.set(Q,G);return G}async function B3(J){if(J.workspace===void 0)return;let W=X5(J);if(W.size>0)return;let Q;try{Q=await I.readFile(w1(J),"utf8")}catch(Y){if(Y.code!=="ENOENT")throw Y;return}let G;try{G=JSON.parse(Q)}catch{return}let z=Array.isArray(G)?G:J5(G)&&Array.isArray(G.annotations)?G.annotations:[];for(let Y of z){if(!J5(Y)||typeof Y.id!=="string")continue;let Z=P3(Y,J);if(Z)W.set(Z.id,Z)}}function U6(J,W=!1){return{id:J.id,file:J.file,pageId:J.pageId,baseRevision:J.baseRevision,candidateHash:J.candidateHash,changedIds:J.changedIds,changedQualifiedIds:J.changedQualifiedIds,affectedPageIds:J.affectedPageIds,diff:J.diff,summary:J.diff.summary,status:J.status,statusReason:J.statusReason,approvedAt:J.approvedAt,consumedAt:J.consumedAt,createdAt:J.createdAt,expiresAt:new Date(J.expiresAt).toISOString(),...W?{xml:J.comparePreviewXml,beforePreviewXml:J.beforePreviewXml,afterPreviewXml:J.candidateXml,candidateXml:J.candidateXml,comparePreviewXml:J.comparePreviewXml}:{}}}function H6(J,W){let Q=b().sessions.get(J.sessionId);if(!Q||g(Q.file)!==J.diagramKey)return;let G=`event: preview
data: ${JSON.stringify({kind:W,preview:U6(J)})}

`;for(let z of b().eventClients.get(J.sessionId)||[])if(z.diagramKey===J.diagramKey)z.response.write(G)}function j3(J=Date.now()){let W=b();for(let[Q,G]of W.patchPreviews){let z=G.terminalAt;if(z!==null&&z+VG<=J)W.patchPreviews.delete(Q)}}function v5(J){if(j3(),!J.activePreviewId)return null;let W=b().patchPreviews.get(J.activePreviewId);if(!W||W.sessionId!==J.sessionId||W.diagramKey!==g(J.file))return J.activePreviewId=null,null;if((W.status==="pending"||W.status==="authorized")&&W.expiresAt<=Date.now())W.status="stale",W.statusReason="\u9884\u89C8\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u57FA\u4E8E\u6700\u65B0\u56FE\u8868\u91CD\u65B0\u751F\u6210",W.approvalToken=null,W.terminalAt=Date.now(),J.activePreviewId=null,H6(W,"stale");else if((W.status==="pending"||W.status==="authorized")&&(W.baseRevision!==J.revision||W.baseFileHash!==J.fileHash))W.status="stale",W.statusReason=`\u56FE\u8868\u5DF2\u4ECE revision ${W.baseRevision} \u66F4\u65B0\u5230 ${J.revision}`,W.approvalToken=null,W.terminalAt=Date.now(),J.activePreviewId=null,H6(W,"stale");return W}function U0(J,W,Q){if(W.status==="applied"||W.status==="cancelled")return;if(W.status="cancelled",W.statusReason=Q,W.approvalToken=null,W.terminalAt=Date.now(),J.activePreviewId===W.id)J.activePreviewId=null;H6(W,"cancelled")}function OJ(J,W,Q,G,z,Y){if(W.includes(O5)||Q.includes(O5))throw Error("formal Draw.io XML must not contain reserved preview artifacts");let Z=v5(J);if(Z&&(Z.status==="pending"||Z.status==="authorized"))U0(J,Z,"\u5DF2\u751F\u6210\u65B0\u7684\u4FEE\u6539\u9884\u89C8");let K=`prv_${i5(9).toString("base64url")}`,$=new Date().toISOString(),U=[...new Set([...Y.added.map((q)=>q.key),...Y.removed.map((q)=>q.key),...Y.changed.map((q)=>q.key),...Y.pageChanges.map((q)=>`${q.pageId}:@page`)])],X=[...new Set([...Y.added.map((q)=>I6(q.key,q.cell.id)),...Y.removed.map((q)=>I6(q.key,q.cell.id)),...Y.changed.map((q)=>q.pageId),...Y.pageChanges.map((q)=>q.pageId)])].filter(Boolean),H=M3(W,Q,Y,K),F={id:K,sessionId:J.sessionId,diagramKey:g(J.file),file:w.relative(J.workspace,J.file).split(w.sep).join("/"),pageId:G,baseRevision:J.revision,baseFileHash:J.fileHash,candidateXml:Q,candidateHash:a(Q),beforePreviewXml:W,comparePreviewXml:H,changedIds:[...new Set(z.length>0?z:[...Y.added.map((q)=>q.cell.id),...Y.removed.map((q)=>q.cell.id),...Y.changed.map((q)=>q.cellId),...Y.pageChanges.map(()=>"@page")])],changedQualifiedIds:U,affectedPageIds:X,diff:Y,status:"pending",statusReason:null,approvalToken:null,approvedAt:null,consumedAt:null,createdAt:$,expiresAt:Date.now()+qG,terminalAt:null};return b().patchPreviews.set(K,F),J.activePreviewId=K,H6(F,"created"),F}function i9(J,W,Q){let G=v5(J);if(!G||G.id!==W.id)throw Error("patch preview is no longer active");if(W.status!=="pending")throw Error(`patch preview is ${W.status}; generate a fresh dry-run preview`);W.status="authorized",W.statusReason=null,W.approvalToken=Q,W.approvedAt=new Date().toISOString(),H6(W,"authorized")}function d8(J,W,Q,G,z){if(!W)throw Error("preview_id is required for an active-session write; create a dry-run preview first");let Y=b().patchPreviews.get(W);if(!Y||Y.sessionId!==J.sessionId||Y.diagramKey!==g(J.file))throw Error("patch preview not found for this session and diagram");if(v5(J),Y.status!=="authorized")throw Error(`patch preview is ${Y.status}; approve the visible preview before writing`);if(!Q||Y.approvalToken!==Q)throw Error("patch preview approval token is missing or invalid");if(Y.consumedAt)throw Error("patch preview approval token has already been used");if(Y.baseRevision!==G||Y.baseRevision!==J.revision)throw Error("patch preview revision no longer matches the active diagram");if(Y.candidateHash!==a(z))throw Error("formal write does not match the candidate XML shown in the preview");return Y}function uJ(J,W){let Q=b(),G=g(J),z=Date.now();for(let Y of Q.patchPreviews.values()){if(Y.diagramKey!==G||Y.status!=="pending"&&Y.status!=="authorized")continue;let Z=Q.sessions.get(Y.sessionId);if(Y.id===W){if(Y.status="applied",Y.statusReason=null,Y.consumedAt=new Date(z).toISOString(),Y.terminalAt=z,Z?.activePreviewId===Y.id)Z.activePreviewId=null;H6(Y,"applied")}else{if(Y.status="stale",Y.statusReason="\u56FE\u8868\u5DF2\u88AB\u5176\u5B83\u4FEE\u6539\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u751F\u6210\u9884\u89C8",Y.approvalToken=null,Y.terminalAt=z,Z?.activePreviewId===Y.id)Z.activePreviewId=null;H6(Y,"stale")}}}function N1(J,W){let Q=J?.trim()||"";return`${Q}${Q&&!Q.endsWith(";")?";":""}${W}`}function I6(J,W){return J.slice(0,Math.max(0,J.length-W.length-1))}function l8(J,W,Q,G,z="",Y=!1){let Z=Y?0:6;return{"@_id":J,"@_value":z,"@_style":["rounded=1","whiteSpace=wrap","html=1",`fillColor=${Y?G:"none"}`,`strokeColor=${G}`,`strokeWidth=${Y?3:4}`,"dashed=1",`opacity=${Y?28:80}`,`fontColor=${G}`,"fontStyle=1","movable=0","resizable=0","editable=0","deletable=0","connectable=0","pointerEvents=0","shadow=0"].join(";")+";","@_vertex":"1","@_parent":W,mxGeometry:{"@_x":String(Q.x-Z),"@_y":String(Q.y-Z),"@_width":String(Math.max(1,Q.width+Z*2)),"@_height":String(Math.max(1,Q.height+Z*2)),"@_as":"geometry"}}}function n9(J,W,Q,G,z=85){let Y=JSON.parse(JSON.stringify(J));return Y["@_id"]=W,Y["@_parent"]=Q,Y["@_value"]="",Y["@_style"]=N1(S(Y["@_style"]),`strokeColor=${G};strokeWidth=4;opacity=${z};dashed=1;movable=0;editable=0;deletable=0;pointerEvents=0;`),Y}function M3(J,W,Q,G){let z=f(J),Y=f(W),Z=Z6(J),K=Z6(W),$=new Map(z.map((j)=>[j.id,j])),U=new Map(Y.map((j)=>[j.id,j])),X=new Map(Z.pages.map((j)=>[j.id,j])),H=new Map(K.pages.map((j)=>[j.id,j])),F=new Map(Q.changed.map((j)=>[j.key,j])),q=new Set(Q.added.map((j)=>j.key)),L=new Set(Q.removed.map((j)=>j.key)),V=0;for(let[j,O]of H){let M=$.get(j),R=U.get(j);if(!R)continue;if(!(Q.added.some((y)=>I6(y.key,y.cell.id)===j)||Q.removed.some((y)=>I6(y.key,y.cell.id)===j)||Q.changed.some((y)=>y.key.startsWith(`${j}:`))))continue;let A=F6(O),N=`${O5}layer_${G}_${V++}`;A.push({"@_id":N,"@_value":"AI \u4FEE\u6539\u9884\u89C8\uFF08\u4E34\u65F6\uFF09","@_parent":"0"});let D=new Map(A.map((y)=>[Z5(y),y])),C=S6(R.cells),T=M?S6(M.cells):null,v=new Map((M?.cells||[]).map((y)=>[y.id,y])),i=new Map(R.cells.map((y)=>[y.id,y]));for(let y of R.cells){if(!y.vertex&&!y.edge)continue;let n=`${j}:${y.id}`,u=D.get(y.id);if(q.has(n)){if(y.vertex){let r=V5(y,C);if(r)A.push(l8(`${O5}added_${G}_${V++}`,N,r,"#22c55e"))}else if(u)A.push(n9(u,`${O5}added_edge_${G}_${V++}`,N,"#22c55e"));continue}let L5=F.get(n);if(!L5)continue;if(y.vertex){let r=V5(y,C);if(r)A.push(l8(`${O5}changed_${G}_${V++}`,N,r,"#f59e0b"));let t=v.get(y.id);if(t&&T&&JSON.stringify(L5.before.geometry)!==JSON.stringify(L5.after.geometry)){let $6=V5(t,T);if($6)A.push(l8(`${O5}old_${G}_${V++}`,N,$6,"#ef4444","\u539F\u4F4D\u7F6E",!0))}}else if(u)A.push(n9(u,`${O5}changed_edge_${G}_${V++}`,N,"#3b82f6"))}if(M&&T){let y=X.get(j),n=new Map(y?F6(y).map((u)=>[Z5(u),u]):[]);for(let u of M.cells){let L5=`${j}:${u.id}`;if(!L.has(L5))continue;if(u.vertex){let r=V5(u,T);if(r)A.push(l8(`${O5}removed_${G}_${V++}`,N,r,"#ef4444",`\u5220\u9664\uFF1A${u.label?.trim()||u.id}`,!0));continue}if(u.edge&&u.source&&u.target&&i.has(u.source)&&i.has(u.target)){let r=n.get(u.id);if(!r)continue;let t=JSON.parse(JSON.stringify(r));t["@_id"]=`${O5}removed_edge_${G}_${V++}`,t["@_parent"]=N,t["@_value"]=u.label?`\u5220\u9664\uFF1A${u.label}`:"",t["@_style"]=N1(S(t["@_style"]),"strokeColor=#ef4444;strokeWidth=4;opacity=45;dashed=1;movable=0;editable=0;deletable=0;"),A.push(t)}}}}let B=q8(K),P=l(f(B));if(!P.valid)throw Error(`generated preview XML is invalid: ${JSON.stringify(P.errors)}`);return B}async function V8(J){let W=b(),Q=g(J.file),z=(W.annotationWriteQueues.get(Q)||Promise.resolve()).catch(()=>{return}).then(async()=>{if(z0("annotationsFile"))throw Error("injected annotation sidecar write failure");let Z=[...X5(J).values()].map((X)=>({id:X.id,file:X.file,pageId:X.pageId,pageName:X.pageName,cells:X.cells,region:X.region,instruction:X.instruction,scope:X.scope,status:X.status,baseRevision:X.baseRevision,baseFileHash:X.baseFileHash,baseCellHashes:X.baseCellHashes,result:X.result,createdAt:X.createdAt,updatedAt:X.updatedAt,resolvedAt:X.resolvedAt,ignoredAt:X.ignoredAt,ignoredReason:X.ignoredReason})),K={schemaVersion:3,file:w.relative(J.workspace,J.file).split(w.sep).join("/"),annotations:Z},$=w1(J),U=`${$}.${process.pid}.${Date.now()}.tmp`;await I.writeFile(U,JSON.stringify(K,null,2),"utf8"),await I.rename(U,$)});W.annotationWriteQueues.set(Q,z);try{await z}finally{if(W.annotationWriteQueues.get(Q)===z)W.annotationWriteQueues.delete(Q)}}function P3(J,W){let Q=Array.isArray(J.cells)?J.cells.filter((Y)=>J5(Y)&&typeof Y.id==="string").map((Y)=>({id:String(Y.id),kind:Y.kind==="edge"?"edge":"node",label:typeof Y.label==="string"?Y.label:"",source:typeof Y.source==="string"?Y.source:void 0,target:typeof Y.target==="string"?Y.target:void 0})):[],G=J5(J.region)&&typeof J.region.x==="number"?{x:Number(J.region.x),y:Number(J.region.y),width:Number(J.region.width),height:Number(J.region.height)}:null,z=J.status==="resolved"||J.status==="ignored"?J.status:"open";return{id:String(J.id),file:w.relative(W.workspace,W.file).split(w.sep).join("/"),pageId:typeof J.pageId==="string"?String(J.pageId):"",pageName:typeof J.pageName==="string"?String(J.pageName):"",cells:Q,region:G,instruction:typeof J.instruction==="string"?String(J.instruction):"",scope:bJ(J.scope),status:z,baseRevision:Number.isInteger(J.baseRevision)?Number(J.baseRevision):0,baseFileHash:typeof J.baseFileHash==="string"?String(J.baseFileHash):"",baseCellHashes:J5(J.baseCellHashes)?Object.fromEntries(Object.entries(J.baseCellHashes).filter((Y)=>typeof Y[1]==="string")):{},result:J5(J.result)&&typeof J.result.summary==="string"?{summary:String(J.result.summary),changedIds:Array.isArray(J.result.changedIds)?J.result.changedIds.map((Y)=>String(Y)):[],revision:Number.isInteger(J.result.revision)?Number(J.result.revision):0,updatedAt:typeof J.result.updatedAt==="string"?String(J.result.updatedAt):""}:null,createdAt:typeof J.createdAt==="string"?String(J.createdAt):new Date().toISOString(),updatedAt:typeof J.updatedAt==="string"?String(J.updatedAt):new Date().toISOString(),resolvedAt:typeof J.resolvedAt==="string"?String(J.resolvedAt):null,ignoredAt:typeof J.ignoredAt==="string"?String(J.ignoredAt):null,ignoredReason:typeof J.ignoredReason==="string"?String(J.ignoredReason):null}}function O3(J,W,Q){let G=J.find((H)=>H.id===W||!W);if(!G)return null;let z=S6(G.cells),Y=z.cellsById,Z=Number.POSITIVE_INFINITY,K=Number.POSITIVE_INFINITY,$=Number.NEGATIVE_INFINITY,U=Number.NEGATIVE_INFINITY,X=!1;for(let H of Q){let F=Y.get(H);if(!F)continue;let q=null;if(F.vertex)q=V5(F,z);else if(F.edge){let L=Z1(F,Y,z);if(L&&L.length>0){let{POSITIVE_INFINITY:V,POSITIVE_INFINITY:B,NEGATIVE_INFINITY:P,NEGATIVE_INFINITY:j}=Number;for(let O of L)V=Math.min(V,O.x),B=Math.min(B,O.y),P=Math.max(P,O.x),j=Math.max(j,O.y);q={x:V,y:B,width:P-V,height:j-B}}}if(!q)continue;X=!0,Z=Math.min(Z,q.x),K=Math.min(K,q.y),$=Math.max($,q.x+q.width),U=Math.max(U,q.y+q.height)}if(!X)return null;return{x:Z,y:K,width:$-Z,height:U-K}}function C3(J,W,Q){let G=J.find((Y)=>Y.id===W||!W);if(!G)return{};let z=new Map(G.cells.map((Y)=>[Y.id,Y]));return Object.fromEntries(Q.flatMap((Y)=>{let Z=z.get(Y);return Z?[[`${G.id}:${Y}`,a(JSON.stringify(d5(Z)))]]:[]}))}function D1(J,W){return J.x<=W.x+W.width&&J.x+J.width>=W.x&&J.y<=W.y+W.height&&J.y+J.height>=W.y}function k1(J,W,Q){let G=f(J.xml),z=W.pageId?G.find((F)=>F.id===W.pageId):G[0];if(!z)throw Error(`annotation page not found: ${W.pageId||"(first page)"}`);let Y=new Map(z.cells.map((F)=>[F.id,F])),Z=new Set(W.cells.map((F)=>F.id)),K=new Set(W.cells.filter((F)=>Y.get(F.id)?.vertex).map((F)=>F.id)),$=new Set(Z),U=new Set,X=new Set(K),H=null;if(Q==="selection_and_edges"){for(let F of z.cells)if(F.edge&&(F.source&&K.has(F.source)||F.target&&K.has(F.target)))$.add(F.id)}if(Q==="surrounding_layout"){let F=S6(z.cells);if(W.region){let L=Math.max(160,Math.min(320,Math.max(W.region.width,W.region.height)));H={x:W.region.x-L,y:W.region.y-L,width:W.region.width+L*2,height:W.region.height+L*2};for(let V of z.cells){if(!V.vertex)continue;let B=V5(V,F);if(B&&D1(H,B))X.add(V.id)}}for(let L of W.cells){let V=Y.get(L.id);if(!V?.edge)continue;if(V.source)X.add(V.source);if(V.target)X.add(V.target)}let q=new Set(X);for(let L of z.cells){if(!L.edge||!L.source||!L.target)continue;if(q.has(L.source)||q.has(L.target))X.add(L.source),X.add(L.target)}for(let L of X)$.add(L);for(let L of z.cells){if(!L.edge)continue;if(Z.has(L.id)||L.source&&L.target&&X.has(L.source)&&X.has(L.target))$.add(L.id)}}if(Q==="diagram_wide"){for(let F of G)for(let q of F.cells)if(q.vertex||q.edge)U.add(`${F.id}:${q.id}`)}return{pages:G,page:z,selectedIds:Z,selectedNodeIds:K,allowedIds:$,allowedQualifiedIds:U,allowedVertexIds:X,expandedRegion:H}}function S1(J){let W=J.activeAnnotationId;if(!W)return null;let Q=X5(J).get(W);if(!Q||Q.status!=="open")return J.annotationAuthorizations.delete(W),J.activeAnnotationId=null,null;return Q}function CJ(J,W,Q){let G=S1(J);if(!G){if(W)throw Error(`annotation ${W} is not active; restore or resolution invalidated its approval. Re-read the annotation and latest state with drawio_get_annotation, then request approval again before writing`);return null}if(!W||W!==G.id)throw Error(`annotation ${G.id} is active; formal writes require its annotation_id and a pre-approved approval_token`);let z=J.annotationAuthorizations.get(G.id);if(!z||!Q||z.token!==Q)throw Error("annotation change has not been approved; call drawio_authorize_annotation_change and wait for the OpenCode approval popup before writing");if(z.consumedAt)throw Error("annotation approval token has already been used; request approval again before another write");if(z.sessionId!==J.sessionId||z.diagramKey!==g(J.file))throw Error("annotation approval belongs to a different diagram session; request approval again");if(z.baseRevision!==J.revision)throw Error(`annotation approval was granted for revision ${z.baseRevision}, but current revision is ${J.revision}; re-read, re-plan and request approval again`);return{task:G,authorization:z,scope:k1(J,G,z.scope)}}function r9(J,W,Q,G){let{task:z,authorization:Y,scope:Z}=J,K=new Set(Y.proposedChangedIds),$=new Set(Q.filter((U)=>U.type==="add-node").map((U)=>U.id));for(let U of Q){let X=Y.scope==="diagram_wide"?`${W}:${U.id}`:U.id;if(!K.has(X))throw Error(`annotation scope violation: ${X} was not disclosed in the approved change plan`);if(Y.scope==="diagram_wide")continue;if(Z.allowedIds.has(U.id))continue;if(Y.scope==="selection_and_edges"&&U.type==="add-edge"){if(U.source&&Z.selectedNodeIds.has(U.source)||U.target&&Z.selectedNodeIds.has(U.target))continue}if(Y.scope==="surrounding_layout"&&U.type==="add-node"){if(!Z.expandedRegion||U.x===void 0||U.y===void 0)throw Error(`annotation scope violation: new node ${U.id} needs explicit x/y inside the approved surrounding region`);let H={x:U.x,y:U.y,width:U.width||160,height:U.height||70};if(D1(Z.expandedRegion,H))continue}if(Y.scope==="surrounding_layout"&&U.type==="add-edge"){let H=!!U.source&&(Z.allowedVertexIds.has(U.source)||$.has(U.source)),F=!!U.target&&(Z.allowedVertexIds.has(U.target)||$.has(U.target));if(H&&F)continue}throw Error(`annotation scope violation: ${U.id} is outside "${I5(Y.scope)}" for ${z.id}; explain the need and request a wider approval before changing it`)}for(let U of G){let X=Y.scope==="diagram_wide"?`${W}:${U}`:U;if(!K.has(X))throw Error(`annotation scope violation: actual change ${X} was not disclosed in the approved plan`);if(Y.scope==="diagram_wide")continue;let H=$.has(U)||Q.some((F)=>F.type==="add-edge"&&F.id===U);if(!Z.allowedIds.has(U)&&!H)throw Error(`annotation scope violation: actual change ${U} is outside the approved boundary`)}}function A3(J,W,Q){let G=w6(W,Q),z=`${J.task.pageId}:`,Y=[...[...G.added,...G.removed,...G.changed].map(($)=>$.key),...G.pageChanges.map(($)=>`${$.pageId}:@page`)],Z=J.authorization.scope==="diagram_wide"?Y:Y.map(($)=>$.startsWith(z)?$.slice(z.length):$),K=new Set(J.authorization.proposedChangedIds);for(let $ of Z){if(!K.has($))throw Error(`annotation scope violation: actual change ${$} was not disclosed in the approved plan`);if(!(J.authorization.scope==="diagram_wide"?J.scope.allowedQualifiedIds.has($)||K.has($):J.scope.allowedIds.has($)))throw Error(`annotation scope violation: full-XML update changes ${$} outside "${I5(J.authorization.scope)}"; use scoped drawio_patch or request wider approval`)}return[...new Set(Z)]}async function AJ(J,W){W.authorization.consumedAt=new Date().toISOString(),W.task.updatedAt=W.authorization.consumedAt,await V8(J),L8(J,W.task,"updated")}function R3(J,W){if(W.status!=="open")return{stale:!1};if(W.baseFileHash&&W.baseFileHash===J.fileHash)return{stale:!1};if(!W.baseFileHash&&W.baseRevision>=J.revision)return{stale:!1};if(W.cells.length===0)return{stale:!1};let Q=J.history.find((z)=>z.revision===W.baseRevision),G=Q&&(!W.baseFileHash||a(Q.xml)===W.baseFileHash)?Q:void 0;try{let z=G?f(G.xml):[],Y=f(J.xml),Z=(H)=>H.id===W.pageId,K=z.find(Z),$=Y.find(Z);if(!$)return{stale:!0,reason:`page "${W.pageName||W.pageId}" no longer exists in the latest revision`};let U=K?new Map(K.cells.map((H)=>[H.id,H])):new Map,X=new Map($.cells.map((H)=>[H.id,H]));for(let H of W.cells){let F=U.get(H.id),q=X.get(H.id);if(!q)return{stale:!0,reason:`selected cell "${H.id}" was deleted since the annotation was created`};let L=W.baseCellHashes[`${W.pageId}:${H.id}`];if(L&&a(JSON.stringify(d5(q)))!==L)return{stale:!0,reason:`selected cell "${H.id}" changed since the annotation was created`};if(!L&&F&&JSON.stringify(d5(F))!==JSON.stringify(d5(q)))return{stale:!0,reason:`selected cell "${H.id}" changed since the annotation was created`};if(!L&&!F&&((H.label||"")!==(q.label||"")||(H.source||"")!==(q.source||"")||(H.target||"")!==(q.target||"")))return{stale:!0,reason:`selected cell "${H.id}" changed since the annotation was created`}}}catch{}return{stale:!1}}function N6(J,W){if(W.status!=="open")return{status:W.status,effectiveStatus:W.status,freshness:"fresh",requiresConfirmation:!1};let Q=R3(J,W);return{status:"open",effectiveStatus:Q.stale?"stale":"open",freshness:Q.stale?"stale":"fresh",requiresConfirmation:Q.stale,staleReason:Q.stale?Q.reason:void 0}}function I1(J,W){if(W==="all")return!0;if(W==="pending"||W==="open")return J.status==="open";if(W==="fresh")return J.status==="open"&&J.freshness==="fresh";if(W==="resolved")return J.status==="resolved";if(W==="ignored")return J.status==="ignored";if(W==="stale")return J.status==="open"&&J.freshness==="stale";return!1}function y1(J){let W={pending:0,open:0,fresh:0,stale:0,resolved:0,ignored:0,all:J.length};for(let Q of J)if(Q.status==="open")W.pending+=1,W.open+=1,W[Q.freshness]+=1;else W[Q.status]+=1;return W}function l5(J,W,Q=N6(J,W)){let G=J.annotationAuthorizations.get(W.id)||null;return{id:W.id,file:W.file,page:{id:W.pageId,name:W.pageName},cells:W.cells,region:W.region,instruction:W.instruction,scope:W.scope,scopeLabel:I5(W.scope),authorization:G?{scope:G.scope,scopeLabel:I5(G.scope),plan:G.plan,proposedChangedIds:G.proposedChangedIds,escalationReason:G.escalationReason,baseRevision:G.baseRevision,approvedAt:G.approvedAt,consumedAt:G.consumedAt}:null,status:Q.status,effectiveStatus:Q.effectiveStatus,freshness:Q.freshness,requiresConfirmation:Q.requiresConfirmation,stale:Q.freshness==="stale",staleReason:Q.staleReason||null,baseRevision:W.baseRevision,currentRevision:J.revision,result:W.result,createdAt:W.createdAt,updatedAt:W.updatedAt,resolvedAt:W.resolvedAt,ignoredAt:W.ignoredAt,ignoredReason:W.ignoredReason}}function L8(J,W,Q){let G=b(),z=g(J.file);for(let Y of G.sessions.values()){if(g(Y.file)!==z)continue;let Z=`event: annotation\\ndata: ${JSON.stringify({kind:Q,annotation:l5(Y,W)})}

`,K=g(Y.file);for(let $ of G.eventClients.get(Y.sessionId)||[])if($.diagramKey===K)$.response.write(Z)}}function o8(J,W){let Q=g(J.file);for(let G of b().sessions.values()){if(g(G.file)!==Q)continue;let z=G.annotationAuthorizations.get(W);if(z?.previewId){let Y=b().patchPreviews.get(z.previewId);if(Y)U0(G,Y,"\u5173\u8054\u7684\u6807\u6CE8\u4EFB\u52A1\u5DF2\u7ED3\u675F")}if(G.annotationAuthorizations.delete(W),G.activeAnnotationId===W)G.activeAnnotationId=null}}function T3(J){let W=new URL("/api/diagram",J.bridgeUrl);W.searchParams.set("sessionId",J.session.sessionId),W.searchParams.set("token",J.token);let Q=new URL("/api/events",J.bridgeUrl);Q.searchParams.set("sessionId",J.session.sessionId),Q.searchParams.set("token",J.token),Q.searchParams.set("file",w.relative(J.session.workspace,J.session.file).split(w.sep).join("/"));let G=new URL("/api/annotations",J.bridgeUrl);G.searchParams.set("sessionId",J.session.sessionId),G.searchParams.set("token",J.token);let z=new URL("/api/history",J.bridgeUrl);z.searchParams.set("sessionId",J.session.sessionId),z.searchParams.set("token",J.token);let Y=new URL("/api/preview",J.bridgeUrl);Y.searchParams.set("sessionId",J.session.sessionId),Y.searchParams.set("token",J.token);let Z=new URL("/api/editor-export",J.bridgeUrl);Z.searchParams.set("sessionId",J.session.sessionId),Z.searchParams.set("token",J.token);let K=tG({file:w.relative(J.session.workspace,J.session.file).split(w.sep).join("/"),drawioUrl:J.editorUrl.toString(),drawioOrigin:J.editorUrl.origin,apiUrl:W.toString(),eventsUrl:Q.toString(),annotationsUrl:G.toString(),historyUrl:z.toString(),patchPreviewUrl:Y.toString(),editorExportUrl:Z.toString()});return`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Draw.io - ${S5(w.basename(J.session.file))}</title>
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
</html>`}async function E3(J,W){let Q=new URL(J.url||"/",`http://${J.headers.host||"localhost"}`),G=b();if(J.method==="GET"&&Q.pathname==="/health"){k(W,200,{ok:!0,service:"drawio-integrated-bridge"});return}let z=J3(J);if(!z){k(W,401,{ok:!1,error:"invalid or expired session token"});return}let{session:Y}=z;if(J.method==="GET"&&Q.pathname==="/editor"){let F=wJ(Y.editorUrl||process.env.DRAWIO_WEB_URL?.trim()||"https://embed.diagrams.net"),q=new URL(`http://${G.host}:${G.port}`);W.writeHead(200,{"Cache-Control":"no-store","Content-Security-Policy":`default-src 'self'; frame-src ${F.origin}; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`,"Content-Type":"text/html; charset=utf-8"}),W.end(T3({session:Y,editorUrl:F,bridgeUrl:q,["token"]:z.sessionKey}));return}if(J.method==="GET"&&Q.pathname==="/api/diagram"){await c(Y),k(W,200,K5(Y));return}if(J.method==="PUT"&&Q.pathname==="/api/diagram"){let F;try{F=await X8(J)}catch(P){k(W,400,{ok:!1,error:P.message});return}let q=typeof F.xml==="string"?F.xml:"",L=F.baseRevision;if(!Number.isInteger(L)){k(W,400,{ok:!1,error:"baseRevision must be an integer"});return}if(q.includes(O5)){k(W,409,{ok:!1,error:"preview_artifact",message:"\u4E34\u65F6\u4FEE\u6539\u9884\u89C8\u4E0D\u80FD\u4FDD\u5B58\u5230\u6B63\u5F0F Draw.io \u6587\u4EF6"});return}let V=v5(Y);if(F.source==="editor"&&V&&(a(q)===V.candidateHash||a(q)===a(V.comparePreviewXml))){k(W,409,{ok:!1,error:"preview_candidate",message:"\u53EA\u8BFB\u4FEE\u6539\u9884\u89C8\u5019\u9009\u4E0D\u80FD\u901A\u8FC7\u7F16\u8F91\u5668\u4FDD\u5B58\uFF0C\u5FC5\u987B\u5148\u5B8C\u6210\u5199\u524D\u5BA1\u6279"});return}let B=await F8(Y,q,L,eG(F.source),typeof F.clientId==="string"?F.clientId:null,{autoMerge:F.source==="editor"});if(B.conflict){k(W,409,{ok:!1,error:"revision_conflict",current:K5(B.current),manualChanges:B.manualChanges,merge:B.merge});return}if(B.invalid){k(W,422,{ok:!1,error:"invalid Draw.io XML",validation:B.report});return}k(W,200,{ok:!0,...K5(B.document),validation:B.validation,autoMerge:B.autoMerge});return}if(J.method==="GET"&&Q.pathname==="/api/events"){W.writeHead(200,{"Cache-Control":"no-cache",Connection:"keep-alive","Content-Type":"text/event-stream; charset=utf-8"}),W.write(`: connected

`);let F=Q.searchParams.get("file"),q=F?P5({directory:Y.workspace},F):Y.file,L={response:W,diagramKey:g(q)},V=G.eventClients.get(Y.sessionId)||new Set;V.add(L),G.eventClients.set(Y.sessionId,V),J.on("close",()=>{if(V.delete(L),V.size===0)G.eventClients.delete(Y.sessionId)});return}if(J.method==="GET"&&Q.pathname==="/api/preview"){await c(Y);let F=v5(Y);k(W,200,{ok:!0,preview:F?U6(F,!0):null});return}let Z=Q.pathname.match(/^\/api\/preview\/([^/]+)$/),K=Z?decodeURIComponent(Z[1]):null;if(K&&J.method==="DELETE"){let F=G.patchPreviews.get(K);if(!F||F.sessionId!==Y.sessionId||F.diagramKey!==g(Y.file)){k(W,404,{ok:!1,error:"patch preview not found"});return}U0(Y,F,"\u7528\u6237\u9000\u51FA\u4E86\u4FEE\u6539\u9884\u89C8"),k(W,200,{ok:!0,preview:U6(F)});return}if(J.method==="GET"&&Q.pathname==="/api/history"){await T1(Y),await c(Y);try{await $3(Y)}catch(V){console.warn(`history reconcile failed for ${Y.file}: ${V.message}`)}let F=null;try{F=await r5(Y)}catch(V){Y.historyWarning=`history disabled: ${V.message}`,console.warn(Y.historyWarning),await E1(Y),F=null}let q=F?[...F.entries].sort((V,B)=>B.sequence-V.sequence):[],L=F?[...F.entries].reverse().find((V)=>V.contentHash===Y.fileHash)?.id??null:null;k(W,200,{ok:!0,file:w.relative(Y.workspace,Y.file).split(w.sep).join("/"),currentRevision:Y.revision,currentSnapshotId:L,historyWarning:Y.historyWarning,count:q.length,entries:q.map((V)=>({id:V.id,sequence:V.sequence,createdAt:V.createdAt,source:V.source,isCurrent:V.id===L,restoredFromSnapshotId:V.restoredFromSnapshotId,restoredFromSequence:V.restoredFromSnapshotId?F?.entries.find((B)=>B.id===V.restoredFromSnapshotId)?.sequence??null:null,pages:V.pages,previewState:V.previewState}))});return}let $=Q.pathname.match(/^\/api\/history\/([^/]+)\/preview$/);if(J.method==="GET"&&$){let F=decodeURIComponent($[1]);if(!$8.test(F)){k(W,400,{ok:!1,error:"invalid snapshot id"});return}let q=Q.searchParams.get("pageId")||"",L=Q.searchParams.get("mode")||"thumb";if(L!=="thumb"&&L!=="preview"){k(W,400,{ok:!1,error:"mode must be thumb or preview"});return}if(!q){k(W,400,{ok:!1,error:"pageId is required"});return}try{let B=(await r5(Y))?.entries.find((O)=>O.id===F);if(!B){k(W,404,{ok:!1,error:"snapshot not found"});return}if(!B.pages.some((O)=>O.id===q)){k(W,404,{ok:!1,error:"page not found in snapshot"});return}try{await hJ(Y,F,B.contentHash)}catch(O){if(O.code==="ENOENT"){k(W,404,{ok:!1,error:"snapshot not found"});return}k(W,503,{ok:!1,error:"preview_unavailable",detail:O.message});return}let P=null,j=M1(Y,F,q,L);try{P=await I.readFile(j)}catch(O){if(O.code!=="ENOENT")throw O}if(!P)try{P=await A1(Y,F,q,L)}catch(O){if(/page not found in snapshot/.test(O.message)){k(W,404,{ok:!1,error:"page not found in snapshot"});return}k(W,503,{ok:!1,error:"preview_unavailable",detail:O.message});return}W.writeHead(200,{"Content-Type":"image/png","Cache-Control":"private, max-age=86400","Content-Length":String(P.length)}),W.end(P)}catch(V){k(W,500,{ok:!1,error:V.message})}return}let U=Q.pathname.match(/^\/api\/history\/([^/]+)\/restore$/);if(J.method==="POST"&&U){let F=decodeURIComponent(U[1]);if(!$8.test(F)){k(W,400,{ok:!1,error:"invalid snapshot id"});return}let q;try{q=await X8(J)}catch(B){k(W,400,{ok:!1,error:B.message});return}let L=q.baseRevision;if(!Number.isInteger(L)){k(W,400,{ok:!1,error:"baseRevision must be an integer"});return}let V=await V3(Y,F,L,typeof q.clientId==="string"?q.clientId:null);if(V.conflict){k(W,409,{ok:!1,error:"revision_conflict",current:K5(V.current)});return}if(V.invalid){if(V.error==="snapshot_not_found")k(W,404,{ok:!1,error:"snapshot_not_found"});else if(V.error==="current_snapshot")k(W,400,{ok:!1,error:"current_snapshot"});else k(W,422,{ok:!1,error:"snapshot_damaged",detail:V.error});return}if(V.checkpointFailed){k(W,500,{ok:!1,error:"current_checkpoint_failed",detail:V.error});return}if(V.partFailed){k(W,200,{ok:!0,partial:!0,message:V.message,...K5(V.document)});return}k(W,200,{ok:!0,...K5(V.document),snapshotId:V.snapshot.id,sequence:V.snapshot.sequence,restoredFromSnapshotId:V.snapshot.restoredFromSnapshotId,restoredFromSequence:V.restoredFromSequence,annotationInvalidationWarning:V.annotationInvalidationWarning});return}let X=Q.pathname.match(/^\/api\/annotations\/([^/]+)$/),H=X?decodeURIComponent(X[1]):null;if(J.method==="GET"&&Q.pathname==="/api/annotations"){await c(Y);let F=X5(Y),q=Q.searchParams.get("status")||"pending";if(!["pending","open","fresh","stale","resolved","ignored","all"].includes(q)){k(W,400,{ok:!1,error:`unsupported annotation status: ${q}`});return}let V=q,B=[...F.values()].map((j)=>({task:j,state:N6(Y,j)})).sort((j,O)=>O.task.updatedAt.localeCompare(j.task.updatedAt)),P=B.filter((j)=>I1(j.state,V)).map((j)=>l5(Y,j.task,j.state));k(W,200,{ok:!0,file:w.relative(Y.workspace,Y.file).split(w.sep).join("/"),status:V,count:P.length,counts:y1(B.map((j)=>j.state)),annotations:P});return}if(J.method==="POST"&&Q.pathname==="/api/annotations"){let F;try{F=await X8(J)}catch(T){k(W,400,{ok:!1,error:T.message});return}let q=typeof F.instruction==="string"?F.instruction.trim():"";if(!q){k(W,400,{ok:!1,error:"instruction must not be empty"});return}let L=typeof F.pageId==="string"?F.pageId:"",V=bJ(F.scope),B=Array.isArray(F.cells)?F.cells.filter((T)=>J5(T)&&typeof T.id==="string").map((T)=>({id:String(T.id),kind:T.kind==="edge"?"edge":"node",label:typeof T.label==="string"?T.label:"",source:typeof T.source==="string"?T.source:void 0,target:typeof T.target==="string"?T.target:void 0})):[];if(B.length===0){k(W,400,{ok:!1,error:"select at least one cell before adding an annotation"});return}await c(Y);let P=f(Y.xml),j=L?P.find((T)=>T.id===L):P[0];if(!j){k(W,400,{ok:!1,error:L?`page "${L}" not found`:"the diagram has no pages to annotate",pages:P.map((T)=>({id:T.id,name:T.name}))});return}let O=new Map(j.cells.map((T)=>[T.id,T]));for(let T of B){let v=O.get(T.id);if(!v){k(W,400,{ok:!1,error:`cell "${T.id}" not found on page "${j.name||j.id}"`});return}if(T.kind==="node"&&!v.vertex){k(W,400,{ok:!1,error:`cell "${T.id}" is not a node on page "${j.name||j.id}"`});return}if(T.kind==="edge"&&!v.edge){k(W,400,{ok:!1,error:`cell "${T.id}" is not an edge on page "${j.name||j.id}"`});return}if(T.kind==="edge"&&v.edge){if(T.source!==void 0&&T.source!==(v.source??"")){k(W,400,{ok:!1,error:`edge "${T.id}" source mismatch: "${T.source}" does not match "${v.source??""}"`});return}if(T.target!==void 0&&T.target!==(v.target??"")){k(W,400,{ok:!1,error:`edge "${T.id}" target mismatch: "${T.target}" does not match "${v.target??""}"`});return}}}let M=j.id,R=typeof F.pageName==="string"?F.pageName:j.name||"",E=O3(P,M,B.map((T)=>T.id)),A=new Date().toISOString(),D={id:`ant_${i5(6).toString("base64url")}`,file:w.relative(Y.workspace,Y.file).split(w.sep).join("/"),pageId:M,pageName:R,cells:B,region:E,instruction:q,scope:V,status:"open",baseRevision:Y.revision,baseFileHash:Y.fileHash,baseCellHashes:C3(P,M,B.map((T)=>T.id)),result:null,createdAt:A,updatedAt:A,resolvedAt:null,ignoredAt:null,ignoredReason:null};X5(Y).set(D.id,D),await V8(Y),L8(Y,D,"created"),k(W,201,{ok:!0,annotation:l5(Y,D)});return}if(H&&J.method==="GET"){await c(Y);let q=X5(Y).get(H);if(!q){k(W,404,{ok:!1,error:"annotation not found"});return}k(W,200,{ok:!0,annotation:l5(Y,q)});return}if(H&&(J.method==="PATCH"||J.method==="PUT")){await c(Y);let F=X5(Y),q=F.get(H);if(!q){k(W,404,{ok:!1,error:"annotation not found"});return}let L;try{L=await X8(J)}catch(B){k(W,400,{ok:!1,error:B.message});return}let V=typeof L.status==="string"?L.status:"";if((V==="resolved"||V==="ignored")&&q.status!=="open"){k(W,409,{ok:!1,error:`annotation is ${q.status}; reopen it before changing to ${V}`});return}if(V==="resolved"){let B=typeof L.summary==="string"?L.summary.trim():"",P=Array.isArray(L.changedIds)?L.changedIds.map((j)=>String(j)):[];q.status="resolved",q.result={summary:B||"resolved",changedIds:P,revision:Y.revision,updatedAt:new Date().toISOString()},q.resolvedAt=q.result.updatedAt,q.ignoredAt=null,q.ignoredReason=null,o8(Y,q.id)}else if(V==="ignored"){let B=typeof L.reason==="string"?L.reason.trim():"";q.status="ignored",q.result=null,q.resolvedAt=null,q.ignoredAt=new Date().toISOString(),q.ignoredReason=B||"\u5DF2\u7531\u7528\u6237\u624B\u52A8\u5FFD\u7565",o8(Y,q.id)}else if(V==="open")o8(Y,q.id),q.status="open",q.result=null,q.resolvedAt=null,q.ignoredAt=null,q.ignoredReason=null;else{k(W,400,{ok:!1,error:`unsupported annotation status: ${V||"(empty)"}`});return}q.updatedAt=new Date().toISOString(),F.set(H,q),await V8(Y),L8(Y,q,"updated"),k(W,200,{ok:!0,annotation:l5(Y,q)});return}if(J.method==="POST"&&Q.pathname==="/api/editor-export"){let F;try{F=await X8(J)}catch(j){k(W,400,{ok:!1,error:j.message});return}let q=typeof F.requestId==="string"?F.requestId:"",L=q?G.pendingEditorExports.get(q):void 0;if(!L||L.sessionId!==Y.sessionId||L.diagramKey!==g(Y.file)){k(W,404,{ok:!1,error:"unknown editor export request"});return}let V=(j)=>{clearTimeout(L.timer),G.pendingEditorExports.delete(q),L.reject(Error(j))};if(typeof F.error==="string"&&F.error){V(`editor export failed: ${F.error}`),k(W,200,{ok:!1,error:F.error});return}if(typeof F.data!=="string"||!F.data){V("editor export returned no data"),k(W,400,{ok:!1,error:"editor export data must be a non-empty data URI"});return}let B;try{B=mG(F.data)}catch(j){V(j.message),k(W,400,{ok:!1,error:j.message});return}try{if(B.length===0||B.length>X6)throw Error("editor export size is out of range");if(pG(B,L.format),L.writeOutput)await yJ(L.outputTarget,B,L.overwrite)}catch(j){V(j.message),k(W,400,{ok:!1,error:j.message});return}clearTimeout(L.timer),G.pendingEditorExports.delete(q);let P={outputTarget:L.outputTarget,bytes:B.length,contentType:dG(L.format),content:L.writeOutput?void 0:B};L.resolve(P),k(W,200,{ok:!0,format:L.format,outputPath:w.relative(Y.workspace,L.outputTarget).split(w.sep).join("/"),bytes:P.bytes});return}k(W,404,{ok:!1,error:"not found"})}function w3(){let J=process.env.DRAWIO_BRIDGE_HOST?.trim()||"127.0.0.1",W=process.env.DRAWIO_BRIDGE_PORT?.trim()||"0",Q=Number(W);if(!Number.isInteger(Q)||Q<0||Q>65535)throw Error(`invalid DRAWIO_BRIDGE_PORT: ${W}`);if(!["127.0.0.1","localhost","::1"].includes(J))throw Error("integrated Draw.io bridge must listen on loopback");return{host:J,port:Q}}async function N3(){let J=b();if(J.startPromise)return J.startPromise;let W=w3();return J.startPromise=new Promise((Q,G)=>{let z=KG((Y,Z)=>{E3(Y,Z).catch((K)=>{if(!Z.headersSent)k(Z,500,{ok:!1,error:K.message});else Z.end()})});z.once("error",(Y)=>{J.startPromise=null,G(Y)}),z.listen(W.port,W.host,()=>{let Y=z.address();if(!Y||typeof Y==="string"){J.startPromise=null,G(Error("integrated Draw.io bridge did not bind a TCP port"));return}J.server=z,J.host=W.host,J.port=Y.port,Q({host:W.host,port:Y.port})})}),J.startPromise}async function DJ(J,W){let Q=y6(J),G=await C5(W),z=l(f(G));if(!z.valid)throw Error(`refusing to open invalid diagram: ${JSON.stringify(z.errors)}`);let Y=b(),Z=Y.sessions.get(J.sessionID),K=Z&&w.resolve(Z.file)===w.resolve(W)?await c(Z):{sessionId:J.sessionID,bindingId:i5(16).toString("base64url"),workspace:Q,file:W,revision:0,xml:G,fileHash:a(G),updatedBy:"initial",updatedAt:new Date().toISOString(),history:[{revision:0,xml:G,updatedBy:"initial",updatedAt:new Date().toISOString()}],backupFile:null,activeAnnotationId:null,activePreviewId:null,annotationAuthorizations:new Map,historyWarning:null};Y.sessions.set(J.sessionID,K),K.bindingId??=i5(16).toString("base64url"),K.activeAnnotationId??=null,K.activePreviewId??=null,K.annotationAuthorizations??=new Map,await B3(K),await q3(K);let $=await N3(),U=i5(24).toString("base64url");return Y.tokens.set(U,{sessionId:J.sessionID,diagramKey:g(K.file),bindingId:K.bindingId,expiresAt:Date.now()+H8}),{session:K,token:U,bridge:$}}var D3=`## Draw.io \u6587\u4EF6\u5199\u5165\u4E0E\u4EA4\u4ED8

\u5DF2\u901A\u8FC7 drawio_open \u7ED1\u5B9A\u7684\u6587\u4EF6\u53EF\u80FD\u5305\u542B\u7528\u6237\u5728\u5185\u7F6E\u6D4F\u89C8\u5668\u4E2D\u7684\u624B\u52A8\u4FEE\u6539\u3002
\u6BCF\u6B21\u65B0\u7684\u7528\u6237\u8F6E\u6B21\u53EA\u8981\u6D89\u53CA\u5DF2\u7ED1\u5B9A\u56FE\u8868\uFF0C\u5373\u4F7F\u672C\u8F6E\u6CA1\u6709\u52A0\u8F7D\u4EFB\u4F55 Draw.io Skill\uFF0C\u4E5F\u5FC5\u987B\u5148\u8C03\u7528 drawio_get_state \u540C\u6B65\u6700\u65B0 revision\u3001XML\u3001updatedBy \u548C updatedAt\uFF0C\u518D\u8C03\u7528 drawio_list_annotations(file=\u5F53\u524D\u6587\u4EF6, status="all") \u68C0\u67E5\u65B0\u589E\u6CE8\u91CA\u4EE5\u53CA instruction\u3001scope\u3001freshness\u3001resolved \u6216 ignored \u72B6\u6001\u53D8\u5316\uFF1B\u672C\u8F6E\u7ED3\u679C\u8986\u76D6\u4E0A\u4E00\u8F6E\u7F13\u5B58\u3002\u6B63\u5F0F\u5199\u5165\u524D\u518D\u6B21\u68C0\u67E5 revision\uFF0C\u6700\u7EC8\u4EA4\u4ED8\u524D\u518D\u6B21\u8C03\u7528 drawio_list_annotations(file=\u5F53\u524D\u6587\u4EF6, status="pending")\uFF1B\u82E5\u72B6\u6001\u53D8\u5316\uFF0C\u5FC5\u987B\u6309\u6700\u65B0\u57FA\u7EBF\u91CD\u65B0\u89C4\u5212\uFF0C\u7981\u6B62\u590D\u7528\u65E7 preview_id\u3001approval_token\u3001\u7A33\u5B9A ID \u6E05\u5355\u6216\u4E0A\u4E00\u8F6E\u7ED3\u8BBA\u3002
\u6BCF\u6B21\u4FEE\u6539\u524D\u5FC5\u987B\u7ACB\u5373\u8C03\u7528 drawio_get_state\uFF0C\u5E76\u628A\u8FD4\u56DE\u7684\u6700\u65B0 XML \u4F5C\u4E3A\u4FEE\u6539\u57FA\u7EBF\u3002\u4EBA\u5DE5\u7F16\u8F91\u4E0D\u662F\u53EA\u8BFB\u5185\u5BB9\uFF0C\u53EF\u4EE5\u6309\u5F53\u524D\u4EFB\u52A1\u8981\u6C42\u7EE7\u7EED\u8C03\u6574\u3002
\u63D0\u4EA4\u65F6\u5FC5\u987B\u643A\u5E26\u8BE5\u6B21\u8BFB\u53D6\u8FD4\u56DE\u7684\u51C6\u786E base_revision\uFF1Brevision_conflict \u540E\u91CD\u65B0\u8BFB\u53D6\uFF0C\u5728\u65B0 XML \u4E0A\u91CD\u65B0\u6267\u884C\u6240\u9700\u53D8\u66F4\u5E76\u91CD\u8BD5\uFF0C\u7981\u6B62\u91CD\u53D1\u65E7 XML\u3002
\u7981\u6B62\u7528\u666E\u901A write\u3001edit \u6216\u811A\u672C\u76F4\u63A5\u8986\u76D6\u5DF2\u7ED1\u5B9A\u7684 .drawio \u6587\u4EF6\uFF0C\u56E0\u4E3A\u8FD9\u4F1A\u7ED5\u8FC7 revision \u68C0\u67E5\u5E76\u53EF\u80FD\u7528\u65E7\u5FEB\u7167\u4E22\u5931\u6700\u65B0\u5185\u5BB9\u3002
\u5BF9\u5DF2\u7ED1\u5B9A\u6587\u4EF6\u6267\u884C drawio_patch \u6216 drawio_polish \u65F6\uFF0C\u5148\u4EE5 dry_run=true \u751F\u6210\u540C\u753B\u5E03\u4FEE\u6539\u9884\u89C8\uFF1B\u5B57\u4F53\u3001\u586B\u5145\u8272\u3001\u6587\u5B57\u8272\u3001\u8FB9\u6846\u8272\u7B49\u5E38\u7528\u5C5E\u6027\u4F7F\u7528 drawio_patch.style_updates\u3002\u53EA\u6709\u5B8C\u6574 XML \u624D\u80FD\u8868\u8FBE\u7684\u9875\u9762\u80CC\u666F\u6216\u9AD8\u7EA7\u6837\u5F0F\u5148\u8C03\u7528 drawio_preview_state\uFF0C\u7981\u6B62\u76F4\u63A5\u8C03\u7528 drawio_update_state \u7ED5\u8FC7\u9884\u89C8\u3002\u9884\u89C8\u628A\u4FEE\u6539\u524D\u3001\u771F\u5B9E\u4FEE\u6539\u540E\u548C\u5E26\u9AD8\u4EAE\u8986\u76D6\u5C42\u7684\u524D\u540E\u5BF9\u6BD4\u5206\u5F00\uFF0C\u5E76\u63D0\u4F9B\u53EF\u6536\u8D77\u7684\u5C5E\u6027\u7EA7\u53D8\u5316\u8BE6\u60C5\uFF1B\u7EFF\u8272\u8868\u793A\u65B0\u589E\u3001\u9EC4\u8272\u8868\u793A\u4FEE\u6539\u3001\u7EA2\u8272\u8868\u793A\u5220\u9664\u6216\u539F\u4F4D\u7F6E\u3001\u84DD\u8272\u8868\u793A\u53D8\u66F4\u8FDE\u7EBF\u3002\u666E\u901A\u4FEE\u6539\u8C03\u7528 drawio_authorize_preview\uFF1B\u7528\u6237\u5728\u5BA1\u6279\u5F39\u7A97\u70B9\u51FB\u5141\u8BB8\u540E\uFF0C\u8BE5\u5DE5\u5177\u4F1A\u7ACB\u5373\u6821\u9A8C\u5E76\u63D0\u4EA4\u753B\u5E03\u4E2D\u5C55\u793A\u7684\u7CBE\u786E\u5019\u9009\uFF0CAgent \u4E0D\u5F97\u7B49\u5F85\u7528\u6237\u518D\u53D1\u6587\u5B57\u786E\u8BA4\uFF0C\u4E5F\u4E0D\u5F97\u91CD\u590D\u8C03\u7528\u6B63\u5F0F patch/polish\u3002\u6CE8\u91CA\u4FEE\u6539\u7EE7\u7EED\u8C03\u7528 drawio_authorize_annotation_change\uFF0C\u5E76\u628A dry-run \u8FD4\u56DE\u7684 preview_id \u4E0E\u7CBE\u786E\u7A33\u5B9A ID \u6E05\u5355\u4E00\u8D77\u7EB3\u5165\u8303\u56F4\u5BA1\u6279\u3002
\u672C\u8F6E\u5168\u90E8\u53EF\u6267\u884C\u521B\u5EFA\u6216\u4FEE\u6539\uFF08\u5305\u62EC fresh annotation\uFF09\u5B8C\u6210\u540E\u5FC5\u987B\u7EDF\u4E00\u8C03\u7528 drawio_finalize\uFF1A\u6821\u9A8C\u3001\u8BC4\u5206\u3001\u81EA\u52A8\u5BFC\u51FA\u540C\u540D PNG\u3002\u8C03\u7528\u524D\u5FC5\u987B\u5148\u8C03\u7528 drawio_list_annotations(status='pending') \u63A2\u6D4B\u672A\u5B8C\u6210\u6CE8\u91CA\uFF1B\u5B58\u5728 requiresConfirmation=false \u7684\u6CE8\u91CA\u65F6 drawio_finalize \u4F1A\u62D2\u7EDD\u6267\u884C\uFF0C\u5FC5\u987B\u5148\u9010\u6761\u5904\u7406\u5E76 drawio_resolve_annotation \u540E\u518D\u91CD\u8BD5\uFF0C\u4E0D\u5F97\u8DF3\u8FC7\u3002\u53EA\u6709\u8FD4\u56DE shouldOpenBrowser=true \u65F6\u624D\u8C03\u7528 MobileWork \u5DE5\u5177 openwork_browser_open_url\uFF0C\u5E76\u4F20\u5165 url=openUrl\u3001provider="builtin"\uFF1BeditorConnected=true \u65F6\u5FC5\u987B\u4FDD\u6301\u73B0\u6709\u7F16\u8F91\u5668\uFF0C\u7981\u6B62\u91CD\u65B0\u6253\u5F00\u6216\u5237\u65B0\uFF0C\u4EE5\u514D\u4E22\u5931\u7528\u6237\u5C1A\u672A\u4FDD\u5B58\u7684\u7F16\u8F91\u3002
drawio_export \u652F\u6301 PNG\u3001JPEG\u3001PDF\u3001xmlpng\u3001SVG\u3001xmlsvg \u548C html2\u3002SVG\u3001xmlsvg\u3001html2 \u7531\u5185\u7F6E\u6D4F\u89C8\u5668\u7F16\u8F91\u5668\u6E32\u67D3\u5E76\u901A\u8FC7 Bridge \u5199\u56DE\u5DE5\u4F5C\u533A\uFF1B\u8FD4\u56DE editor_required \u65F6\u5FC5\u987B\u7ACB\u5373\u8C03\u7528 openwork_browser_open_url\uFF0C\u5E76\u4F20\u5165 url=openUrl\u3001provider="builtin"\uFF0C\u7B49\u5F85\u7F16\u8F91\u5668\u8FDE\u63A5\u540E\u7528\u5B8C\u5168\u76F8\u540C\u7684\u53C2\u6570\u91CD\u8BD5\uFF0C\u7981\u6B62\u628A\u8BE5\u72B6\u6001\u89E3\u91CA\u4E3A\u4E0D\u652F\u6301\u683C\u5F0F\u6216\u8981\u6C42\u7528\u6237\u624B\u5DE5\u5BFC\u51FA\u3002PNG\u3001JPEG\u3001xmlpng\u3001SVG\u3001xmlsvg \u4F7F\u7528 all_pages=true \u65F6\u9010\u9875\u751F\u6210\u6587\u4EF6\u5E76\u8FD4\u56DE outputs[]\uFF0C\u5FC5\u987B\u6838\u5BF9 page_count \u4E0E outputs \u6570\u91CF\u4E00\u81F4\uFF1BPDF \u548C html2 \u7684 all_pages=true \u5404\u8FD4\u56DE\u4E00\u4E2A\u5305\u542B\u5168\u90E8\u9875\u9762\u7684\u591A\u9875\u5355\u6587\u4EF6\uFF0Chtml2 \u8FD8\u9700\u6838\u5BF9 contains_all_pages=true\u3002

## \u6CE8\u91CA\u4EFB\u52A1\uFF08\u6846\u9009\u8BC4\u5BA1\uFF09

\u7528\u6237\u5728\u5185\u7F6E\u6D4F\u89C8\u5668\u4E2D\u6846\u9009\u56FE\u5143\u5E76\u63D0\u4EA4\u6CE8\u91CA\u540E\uFF0C\u6BCF\u6761\u6CE8\u91CA\u662F\u4E00\u6761\u6309\u56FE\u8868\u6587\u4EF6\u6301\u4E45\u5316\u7684\u72EC\u7ACB\u4EFB\u52A1\uFF0C\u4E0D\u7ED1\u5B9A\u521B\u5EFA\u5B83\u7684\u5BF9\u8BDD session\uFF1B\u4EFB\u52A1\u8BB0\u5F55\u7A33\u5B9A ID\u3001\u9875\u9762\u3001\u533A\u57DF\u8303\u56F4\u3001\u4FEE\u6539\u8BF4\u660E\u3001\u5141\u8BB8\u8303\u56F4\u548C\u63D0\u4EA4\u65F6\u7684\u56FE\u8868\u57FA\u7EBF\u3002
\u6CE8\u91CA\u7684\u6301\u4E45\u5316 status \u4E3A open/resolved/ignored\uFF1Bfreshness=stale \u8868\u793A\u56FE\u5143\u5DF2\u53D8\u5316\u4F46\u4EFB\u52A1\u4ECD\u672A\u5B8C\u6210\u3002\u6267\u884C stale \u6CE8\u91CA\u524D\u5FC5\u987B\u5148\u8BE2\u95EE\u7528\u6237\uFF1Bfresh \u6CE8\u91CA\u53EF\u76F4\u63A5\u8FDB\u5165\u8BA1\u5212\u548C\u5BA1\u6279\u6D41\u7A0B\u3002resolved \u548C ignored \u90FD\u662F\u7EC8\u6001\uFF0CAgent \u5FC5\u987B\u8DF3\u8FC7\uFF0C\u53EA\u6709\u7528\u6237\u91CD\u65B0\u6253\u5F00\u540E\u624D\u80FD\u5904\u7406\u3002
\u5904\u7406\u6CE8\u91CA\u65F6\u5FC5\u987B\u5148\u8BFB\u53D6\u6700\u65B0\u72B6\u6001\u5E76 dry-run\uFF0C\u8BA9\u5019\u9009\u7ED3\u679C\u663E\u793A\u5728\u540C\u4E00 Draw.io \u753B\u5E03\u4E2D\uFF1B\u5411\u7528\u6237\u8BF4\u660E\u8BA1\u5212\u3001\u5B8C\u6574\u7A33\u5B9A ID \u6E05\u5355\u548C\u8303\u56F4\u540E\uFF0C\u643A\u5E26 preview_id \u8C03\u7528 drawio_authorize_annotation_change\u3002\u8BE5\u5DE5\u5177\u5FC5\u987B\u7531 OpenCode \u4EE5 ask \u6743\u9650\u5F39\u7A97\u5728\u5199\u5165\u524D\u6279\u51C6\uFF1B\u6279\u51C6\u540E\u624D\u53EF\u628A\u5F53\u524D session \u7684\u4E00\u6B21\u6027 token \u4F20\u7ED9\u6B63\u5F0F drawio_patch/drawio_update_state\uFF0C\u4E14\u5199\u5165 XML \u5FC5\u987B\u4E0E\u5DF2\u5C55\u793A\u5019\u9009\u5B8C\u5168\u4E00\u81F4\u3002\u975E\u5168\u56FE\u8303\u56F4\u7531\u8FD0\u884C\u65F6\u5F3A\u5236\u4F7F\u7528\u6CE8\u91CA\u7ED1\u5B9A\u7684 pageId\uFF1Bdiagram_wide \u8986\u76D6\u5F53\u524D\u56FE\u8868\u5168\u90E8\u9875\u9762\u5E76\u4F7F\u7528 pageId:cellId\u3002\u7981\u6B62\u5148\u6539\u540E\u95EE\u3002
\u4E0D\u5F97\u4FEE\u6539\u6388\u6743\u8303\u56F4\u5916\u5185\u5BB9\u3002\u786E\u9700\u8D8A\u754C\u65F6\uFF0C\u5728 authorization \u7684 escalation_reason \u4E2D\u5148\u8BF4\u660E\u4E0D\u53EF\u907F\u514D\u7684\u539F\u56E0\u5E76\u7533\u8BF7\u66F4\u5BBD\u8303\u56F4\uFF1B\u672A\u83B7\u6279\u51C6\u4E0D\u5F97\u5199\u5165\u3002drawio_polish \u4F1A\u91CD\u6392\u6574\u9875\uFF0C\u5B58\u5728\u6D3B\u52A8\u6CE8\u91CA\u65F6\u53EA\u6709\u53D6\u5F97 diagram_wide \u5BA1\u6279\u540E\u624D\u80FD\u6B63\u5F0F\u8FD0\u884C\u3002
\u7528\u6237\u672C\u8F6E\u53E6\u6709\u660E\u786E\u4EFB\u52A1\u65F6\u5148\u5B8C\u6210\u8BE5\u4EFB\u52A1\uFF0C\u7136\u540E\u5728\u540C\u4E00\u8F6E\u91CD\u65B0\u63A2\u6D4B\u6CE8\u91CA\uFF1B\u6700\u7EC8\u56DE\u590D\u524D\u4ECD\u5B58\u5728 requiresConfirmation=false \u7684 open \u6CE8\u91CA\u65F6\u5FC5\u987B\u7EE7\u7EED\u5904\u7406\uFF0C\u4E0D\u80FD\u53EA\u63D0\u793A\u7528\u6237\u7A0D\u540E\u7EE7\u7EED\u3002
\u6CE8\u91CA\u4EFB\u52A1\u7684\u68C0\u67E5\u4E0E\u5904\u7406\u6D41\u7A0B\u7531 drawio-session-editing \u6280\u80FD\u8D1F\u8D23\u7F16\u6392\uFF0C\u8BE6\u89C1\u8BE5 SKILL.md\u3002`,k3="Agent ID \u662F `drawio-expert`";function S3(J){if(!J||typeof J!=="object"||Array.isArray(J))return null;let W=J;for(let Q of["filePath","file_path","path","file"])if(typeof W[Q]==="string"&&W[Q].toLowerCase().endsWith(".drawio"))return W[Q];return null}async function _U(J){await J1(J)}function xU(J){if(!J.system.some((W)=>W.includes(k3)))return!1;return J.system.push(D3),!0}function hU(J,W){if(!["write","edit","apply_patch"].includes(J.tool))return;let Q=S3(W.args);if(!Q)return;let z=b().sessions.get(J.sessionID);if(!z)return;if((w.isAbsolute(Q)?w.resolve(Q):w.resolve(z.workspace,Q)).toLowerCase()===w.resolve(z.file).toLowerCase())throw Error("This Draw.io file is bound to an active browser session. Call drawio_get_state, then use drawio_patch, drawio_polish, or drawio_update_state with its exact revision.")}var uU=["drawio_validate","drawio_export","drawio_health_check","drawio_create","drawio_inspect","drawio_quality","drawio_patch","drawio_polish","drawio_compare","drawio_get_state","drawio_preview_state","drawio_update_state","drawio_open","drawio_finalize","drawio_list_annotations","drawio_get_annotation","drawio_authorize_preview","drawio_authorize_annotation_change","drawio_resolve_annotation"],o9=new WeakMap;function I3(J){let W=o9.get(J);if(W)return W;let Q=J,G=Q.schema.object({id:Q.schema.string().describe("Stable unique cell id; 0 and 1 are reserved"),label:Q.schema.string().describe("Visible node label"),kind:Q.schema.enum(["default","application","service","database","external","decision"]).optional().describe("Visual node category")}),z=Q.schema.object({id:Q.schema.string().optional().describe("Stable unique edge id"),source:Q.schema.string().describe("Source node id"),target:Q.schema.string().describe("Target node id"),label:Q.schema.string().optional().describe("Visible edge label")}),Y=Q.schema.object({font_size:Q.schema.number().positive().max(200).optional(),font_family:Q.schema.string().min(1).max(120).optional(),font_color:Q.schema.string().min(1).max(80).optional(),fill_color:Q.schema.string().min(1).max(80).optional(),stroke_color:Q.schema.string().min(1).max(80).optional(),stroke_width:Q.schema.number().min(0).max(50).optional(),opacity:Q.schema.number().min(0).max(100).optional(),rounded:Q.schema.boolean().optional(),dashed:Q.schema.boolean().optional()}),Z=Q.schema.object({type:Q.schema.enum(["add-node","update-node","remove-node","add-edge","update-edge","remove-edge"]),id:Q.schema.string().describe("Stable target or new cell id"),label:Q.schema.string().optional(),kind:Q.schema.enum(["default","application","service","database","external","decision"]).optional(),source:Q.schema.string().optional(),target:Q.schema.string().optional(),x:Q.schema.number().optional(),y:Q.schema.number().optional(),width:Q.schema.number().positive().optional(),height:Q.schema.number().positive().optional(),style_updates:Y.optional().describe("Whitelisted visual property updates that preserve unrelated style keys"),cascade:Q.schema.boolean().optional().describe("For remove-node, also remove connected edges")}),K=(U)=>J({...U,async execute(X,H){return await J1(H.directory),U.execute(X,H)}}),$={drawio_validate:K({description:"Validate a workspace Draw.io file and report pages, file size, nodes, edges, errors, and warnings.",args:{input_path:Q.schema.string().describe("Workspace-relative .drawio or .xml file")},async execute(U,X){let H=P5(X,U.input_path),F=k5(X,H),q=F?(await c(F)).xml:await C5(H),L=f(q),V=await I.stat(H);return JSON.stringify({success:!0,input_path:h(X,H),file_size_bytes:V.size,is_valid_drawio:!0,page_count:L.length,pages:L.map((B)=>({id:B.id,name:B.name,compressed:B.compressed,nodes:B.cells.filter((P)=>P.vertex).length,edges:B.cells.filter((P)=>P.edge).length})),...l(L)},null,2)}}),drawio_export:K({description:"Export a workspace Draw.io file. PNG, JPEG, PDF, and editable PNG (xmlpng) use the Docker HTTP Export Server. SVG, editable SVG (xmlsvg), and HTML (html2) use the built-in browser Bridge. all_pages=true writes one file per page for PNG/JPEG/xmlpng/SVG/XMLSVG, while PDF and HTML2 each produce one multi-page file. page_id exports one page for every format. When an editor-channel export is not connected, call openwork_browser_open_url with url=openUrl and provider=builtin, then retry the same export.",args:{input_path:Q.schema.string().describe("Workspace-relative .drawio or .xml input file"),format:Q.schema.enum(["png","jpeg","pdf","xmlpng","svg","xmlsvg","html2"]),output_path:Q.schema.string().optional().describe("Workspace-relative output path"),page_id:Q.schema.string().optional().describe("Stable page id to export; cannot be combined with all_pages"),all_pages:Q.schema.boolean().default(!1).describe("Export every page; multi-file formats return outputs[], while PDF and HTML2 return one multi-page file"),scale:Q.schema.number().positive().default(1),border:Q.schema.number().int().min(0).default(0),background:Q.schema.string().default(RJ).describe("Export background color; defaults to white to avoid transparent PNG previews"),embed_xml:Q.schema.boolean().default(!1),overwrite:Q.schema.boolean().default(!1)},async execute(U,X){let H=P5(X,U.input_path),F=k5(X,H),q=F?await c(F):null,L=q?.xml||await C5(H),V=q?.revision,B=l(f(L));if(!B.valid)throw Error(`refusing to export invalid Draw.io XML: ${JSON.stringify(B.errors)}`);if(U.page_id&&U.all_pages)throw Error("page_id and all_pages cannot be used together");if(K1.has(U.format)){let j=U.page_id?V1(L,U.page_id):null;if(U.all_pages&&F1.has(U.format)){let R=await rG({context:X,inputTarget:H,xml:L,format:U.format,outputPath:U.output_path,sourceRevision:V,overwrite:U.overwrite});if(R.status==="editor_required")return JSON.stringify({status:"editor_required",message:"SVG and HTML exports are rendered by the Draw.io editor page in the built-in browser, which is currently not connected for this diagram.",input_path:h(X,H).split(w.sep).join("/"),format:U.format,all_pages:!0,openUrl:R.openUrl,browserAction:"Call MobileWork's openwork_browser_open_url tool with url=openUrl and provider=builtin now, wait for the editor page to finish loading, then call drawio_export again with identical arguments to complete the export.",tokenExpiresAt:R.tokenExpiresAt},null,2);return JSON.stringify({success:!0,channel:"editor",input_path:h(X,H).split(w.sep).join("/"),format:U.format,all_pages:!0,page_count:R.outputs.length,source_revision:R.sourceRevision,outputs:R.outputs.map((E)=>({page_index:E.pageIndex,page_id:E.pageId,page_name:E.pageName,output_path:h(X,E.outputTarget).split(w.sep).join("/"),file_size_bytes:E.bytes,content_type:E.contentType}))},null,2)}let O=U.page_id?U.format==="html2"?gG(L,U.page_id):L:U.all_pages?L:void 0,M=await L1({context:X,inputTarget:H,format:U.format,outputPath:U.output_path,xml:O,pageId:U.page_id,allPages:U.all_pages,sourceRevision:V,overwrite:U.overwrite});if(M.status==="editor_required")return JSON.stringify({status:"editor_required",message:"SVG and HTML exports are rendered by the Draw.io editor page in the built-in browser, which is currently not connected for this diagram.",input_path:h(X,H).split(w.sep).join("/"),format:U.format,openUrl:M.openUrl,browserAction:"Call MobileWork's openwork_browser_open_url tool with url=openUrl and provider=builtin now, wait for the editor page to finish loading, then call drawio_export again with identical arguments to complete the export.",tokenExpiresAt:M.tokenExpiresAt},null,2);return JSON.stringify({success:!0,channel:"editor",input_path:h(X,H).split(w.sep).join("/"),output_path:h(X,M.outputTarget).split(w.sep).join("/"),format:U.format,file_size_bytes:M.bytes,content_type:M.contentType,page_id:j?.id,page_name:j?.name,all_pages:U.all_pages,page_count:U.all_pages&&U.format==="html2"?B.stats.pages:void 0,contains_all_pages:U.all_pages&&U.format==="html2"?!0:void 0,source_revision:M.sourceRevision},null,2)}if(U.all_pages&&X1.has(U.format)){let j=await iG({context:X,inputTarget:H,xml:L,format:U.format,outputPath:U.output_path,scale:U.scale,border:U.border,background:U.background,embedXml:U.format==="xmlpng"||U.embed_xml,overwrite:U.overwrite});return JSON.stringify({success:!0,channel:"docker",input_path:h(X,H).split(w.sep).join("/"),format:U.format,all_pages:!0,page_count:j.length,outputs:j.map((O)=>({page_index:O.pageIndex,page_id:O.pageId,page_name:O.pageName,output_path:h(X,O.outputTarget).split(w.sep).join("/"),file_size_bytes:O.bytes,content_type:O.contentType,export_url:O.exportUrl}))},null,2)}let P=await m9({context:X,inputTarget:H,xml:L,format:U.format,outputPath:U.output_path,pageId:U.page_id,allPages:U.all_pages,scale:U.scale,border:U.border,background:U.background,embedXml:U.format==="xmlpng"||U.embed_xml,overwrite:U.overwrite});return JSON.stringify({success:!0,channel:"docker",input_path:h(X,H).split(w.sep).join("/"),output_path:h(X,P.outputTarget).split(w.sep).join("/"),format:U.format,file_size_bytes:P.bytes,content_type:P.contentType,export_url:P.exportUrl,all_pages:U.all_pages,page_count:U.all_pages?B.stats.pages:void 0},null,2)}}),drawio_health_check:K({description:"Check the TypeScript Draw.io runtime and Docker Export Server; deep=true performs a real PNG export.",args:{deep:Q.schema.boolean().default(!1)},async execute(U,X){let H=W0(),F=await oG(),q={success:F.reachable,checks:{runtime:{status:"ok",implementation:"opencode-typescript-plugin"},workspace:{root:y6(X)},export_server:{url:H.url.toString(),...F},supported_formats:["html2","jpeg","pdf","png","svg","xmlpng","xmlsvg"],export_channels:{docker_export_server:["jpeg","pdf","png","xmlpng"],builtin_browser_editor:["html2","svg","xmlsvg"]},configuration:{timeout_seconds:H.timeoutMs/1000,max_input_size_mb:X6/1024/1024,max_output_size_mb:H.maxOutputBytes/1024/1024}}};if(U.deep&&F.reachable)try{let L=u9("HealthCheck",[{id:"health",label:"OK",kind:"default"}],[],"left-to-right",!1),V=await Y0(L,"png");q.checks.deep_test={success:!0,format:"png",content_type:V.contentType,size_bytes:V.content.length}}catch(L){q.success=!1,q.checks.deep_test={success:!1,error:L.message}}else if(U.deep)q.checks.deep_test={success:!1,error:"export server is not reachable"};return JSON.stringify(q,null,2)}}),drawio_create:K({description:"Create a validated Draw.io file from a semantic graph. Use this instead of writing mxGraphModel XML directly.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml output path"),title:Q.schema.string().describe("Diagram page title"),nodes:Q.schema.array(G).describe("Diagram nodes"),edges:Q.schema.array(z).default([]).describe("Diagram edges"),direction:Q.schema.enum(["left-to-right","top-to-bottom"]).default("left-to-right").describe("Layered layout direction"),compressed:Q.schema.boolean().default(!1).describe("Write standard compressed Draw.io page payload"),overwrite:Q.schema.boolean().default(!1).describe("Allow replacement; the previous file is preserved as a timestamped backup")},async execute(U,X){NG(U.nodes,U.edges);let H=P5(X,U.file);if(k5(X,H))throw Error("active Draw.io sessions cannot be replaced by drawio_create; call drawio_get_state and submit an incremental revision-aware update");let F=u9(U.title,U.nodes,U.edges,U.direction,U.compressed),q=f(F),L=l(q);if(!L.valid)throw Error(`generated diagram failed validation: ${JSON.stringify(L.errors)}`);let V=await n8(H,F,U.overwrite);return JSON.stringify({created:h(X,H),backup:V.backup?h(X,V.backup):null,compressed:U.compressed,...L},null,2)}}),drawio_inspect:K({description:"Inspect a compressed or uncompressed Draw.io file and return pages, nodes, edges, geometry, and styles.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file")},async execute(U,X){let H=P5(X,U.file),F=k5(X,H),q=F?(await c(F)).xml:await C5(H),L=f(q);return JSON.stringify({file:h(X,H),pages:L.map((V)=>({id:V.id,name:V.name,compressed:V.compressed,nodes:V.cells.filter((B)=>B.vertex),edges:V.cells.filter((B)=>B.edge)})),...l(L)},null,2)}}),drawio_quality:K({description:"Score Draw.io layout quality and report actionable issues including node overlaps, edge-node intersections, edge crossings, edge-label collisions, empty labels, and missing arc line jumps.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file"),threshold:Q.schema.number().min(0).max(100).default(90).describe("Minimum accepted quality score")},async execute(U,X){let H=P5(X,U.file),F=k5(X,H),q=F?(await c(F)).xml:await C5(H),L=f(q);return JSON.stringify({file:h(X,H),...m8(L,U.threshold)},null,2)}}),drawio_patch:K({description:"Apply semantic node and edge operations, including whitelisted font, color, stroke, opacity and shape-style updates, to an existing Draw.io file. Pass annotation_id when executing an annotation so its bound page is enforced. Preserves unrelated cells and creates a recoverable backup unless dry_run is true.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file"),page:Q.schema.string().optional().describe("Page id or name; defaults to the first page unless annotation_id enforces the annotation page"),annotation_id:Q.schema.string().optional().describe("Annotation being executed; binds the target page and is mandatory for a formal annotation-driven write"),operations:Q.schema.array(Z).min(1).describe("Ordered semantic operations"),dry_run:Q.schema.boolean().default(!1).describe("Return the diff and validation result without writing"),base_revision:Q.schema.number().int().min(0).optional().describe("Exact revision returned by drawio_get_state; mandatory when writing an active session"),approval_token:Q.schema.string().optional().describe("One-time token returned after drawio_authorize_annotation_change is approved"),preview_id:Q.schema.string().optional().describe("Preview id returned by the immediately preceding active-session dry-run"),preview_approval_token:Q.schema.string().optional().describe("One-time token returned by drawio_authorize_preview; annotation approval_token also authorizes its linked preview")},async execute(U,X){let H=P5(X,U.file),F=k5(X,H),q=F?await c(F):null,L=U.page;if(U.annotation_id){if(!q)throw Error("annotation_id requires an active Draw.io session for this file");let C=X5(q).get(U.annotation_id);if(!C)throw Error(`annotation not found: ${U.annotation_id}`);if(C.status!=="open")throw Error(`annotation is ${C.status} and must be reopened before processing: ${U.annotation_id}`);if(!C.pageId.trim())throw Error(`annotation has no stable page id: ${U.annotation_id}`);if(C.scope!=="diagram_wide"&&U.page&&U.page!==C.pageId&&U.page!==C.pageName)throw Error(`annotation ${U.annotation_id} is bound to page ${C.pageId}; received page ${U.page}`);L=C.scope==="diagram_wide"&&U.page?U.page:C.pageId}if(q&&!U.dry_run&&U.base_revision===void 0)throw Error("base_revision is required for an active Draw.io session; call drawio_get_state immediately before writing");let V=q&&!U.dry_run?CJ(q,U.annotation_id,U.approval_token):null,B=q?.xml||await C5(H),P=f(B),j=Z6(B),O=_9(j,L),M=EG(O,U.operations);if(V)r9(V,O.id,U.operations,M);let R=q8(j),E=f(R),A=l(E);if(!A.valid)throw Error(`patched diagram failed validation: ${JSON.stringify(A.errors)}`);let N=w6(P,E);if(U.dry_run){let C=q?OJ(q,B,R,O.id,M,N):null;return JSON.stringify({file:U.file,dryRun:!0,changedIds:M,diff:N,preview:C?U6(C):null,previewGuidance:C?"The exact candidate is visible in the bound Draw.io canvas. Review it before authorization.":"Bind the file with drawio_open or drawio_finalize to receive an interactive canvas preview.",...A},null,2)}if(q){let C=U.preview_id||V?.authorization.previewId||q.activePreviewId||void 0,T=d8(q,C,U.preview_approval_token||U.approval_token,U.base_revision,R),v=await F8(q,R,U.base_revision,"agent",null,{appliedPreviewId:T.id});if(v.conflict)return JSON.stringify({file:U.file,dryRun:!1,...v},null,2);if(v.invalid)throw Error(`patched diagram failed validation: ${JSON.stringify(v.report.errors)}`);if(V)await AJ(q,V);return JSON.stringify({file:h(X,H),dryRun:!1,backup:q.backupFile?h(X,q.backupFile):null,revision:q.revision,changedIds:M,diff:N,...A},null,2)}let D=await n8(H,R,!0);return JSON.stringify({file:h(X,H),dryRun:!1,backup:D.backup?h(X,D.backup):null,changedIds:M,diff:N,...A},null,2)}}),drawio_polish:K({description:"Run a deterministic quality loop: analyze, auto-layout and reroute a page, validate the result, enforce a quality threshold, and optionally write with backup.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file"),page:Q.schema.string().optional().describe("Page id or name; defaults to the first page"),direction:Q.schema.enum(["left-to-right","top-to-bottom"]).default("left-to-right").describe("Layered layout direction"),threshold:Q.schema.number().min(0).max(100).default(90).describe("Minimum quality score required before writing"),dry_run:Q.schema.boolean().default(!0).describe("Analyze and preview the complete diff without writing"),base_revision:Q.schema.number().int().min(0).optional().describe("Exact revision returned by drawio_get_state; mandatory when writing an active session"),annotation_id:Q.schema.string().optional().describe("Active annotation id; whole-page polish requires diagram_wide approval"),approval_token:Q.schema.string().optional().describe("One-time diagram_wide token returned by drawio_authorize_annotation_change"),preview_id:Q.schema.string().optional().describe("Preview id returned by the dry-run"),preview_approval_token:Q.schema.string().optional().describe("One-time token returned by drawio_authorize_preview")},async execute(U,X){let H=P5(X,U.file),F=k5(X,H),q=F?await c(F):null;if(q&&!U.dry_run&&U.base_revision===void 0)throw Error("base_revision is required for an active Draw.io session; call drawio_get_state immediately before writing");let L=q&&!U.dry_run?CJ(q,U.annotation_id,U.approval_token):null;if(L&&L.authorization.scope!=="diagram_wide")throw Error("drawio_polish may relayout the whole page and requires diagram_wide annotation approval; use scoped drawio_patch or request wider approval");let V=q?.xml||await C5(H),B=f(V),P=m8(B,U.threshold),j=Z6(V),O=_9(j,U.page),M=xG(O,U.direction);if(L)r9(L,O.id,[],M);let R=q8(j),E=f(R),A=m8(E,U.threshold),N=w6(B,E),D={file:h(X,H),dryRun:U.dry_run,accepted:A.pass,changedIds:M,diff:N,beforeQuality:P,afterQuality:A};if(U.dry_run){let T=q?OJ(q,V,R,O.id,M,N):null;return JSON.stringify({...D,backup:null,preview:T?U6(T):null},null,2)}if(!A.pass)throw Error(`polished diagram did not meet quality threshold ${U.threshold}; score=${A.score}, issues=${JSON.stringify(A.issues)}`);let C;if(q){let T=U.preview_id||L?.authorization.previewId||q.activePreviewId||void 0,v=d8(q,T,U.preview_approval_token||U.approval_token,U.base_revision,R),i=await F8(q,R,U.base_revision,"agent",null,{appliedPreviewId:v.id});if(i.conflict)return JSON.stringify({...D,conflict:!0,current:K5(i.current),manualChanges:i.manualChanges},null,2);if(i.invalid)throw Error(`polished diagram failed validation: ${JSON.stringify(i.report.errors)}`);if(L)await AJ(q,L);C={backup:q.backupFile}}else C=await n8(H,R,!0);return JSON.stringify({...D,backup:C.backup?h(X,C.backup):null},null,2)}}),drawio_compare:K({description:"Compare two Draw.io files by stable page and cell ids, reporting added, removed, changed, and unchanged nodes and edges.",args:{before:Q.schema.string().describe("Workspace-relative baseline .drawio, .xml, or plugin-created .bak file"),after:Q.schema.string().describe("Workspace-relative updated .drawio, .xml, or plugin-created .bak file")},async execute(U,X){let H=a8(X,U.before,f9),F=a8(X,U.after,f9),q=f(await C5(H)),L=f(await C5(F));return JSON.stringify({before:h(X,H),after:h(X,F),diff:w6(q,L),beforeStats:l(q).stats,afterStats:l(L).stats},null,2)}}),drawio_get_state:K({description:"Read the latest XML and revision for the current session's active Draw.io file. Use this before changing a user-edited diagram.",args:{since_revision:Q.schema.number().int().min(0).optional().describe("Optionally report stable-ID changes since this revision")},async execute(U,X){let H=b().sessions.get(X.sessionID);if(!H)throw Error("No active Draw.io session. Call drawio_open first.");await c(H);let F=K5(H);if(U.since_revision!==void 0)F.changesSince=r8(H,U.since_revision);return JSON.stringify(F,null,2)}}),drawio_preview_state:K({description:"Preview an exact complete-XML candidate in the active Draw.io canvas without writing it. Use when semantic drawio_patch operations cannot express the requested change, including page backgrounds or advanced styles.",args:{base_revision:Q.schema.number().int().min(0).describe("Exact revision returned by the immediately preceding drawio_get_state call"),xml:Q.schema.string().min(1).describe("Complete candidate Draw.io XML"),annotation_id:Q.schema.string().optional().describe("Open annotation task this candidate is intended to address")},async execute(U,X){let H=b().sessions.get(X.sessionID);if(!H)throw Error("No active Draw.io session. Call drawio_open first.");if(await c(H),U.base_revision!==H.revision)return JSON.stringify({ok:!1,error:"revision_conflict",current:K5(H),manualChanges:r8(H,U.base_revision)},null,2);if(U.annotation_id){let O=X5(H).get(U.annotation_id);if(!O)throw Error(`annotation not found: ${U.annotation_id}`);if(O.status!=="open")throw Error(`annotation is ${O.status} and must be reopened before previewing`)}if(U.xml.includes(O5))throw Error("formal Draw.io XML must not contain reserved preview artifacts");let F=f(U.xml),q=l(F);if(!q.valid)return JSON.stringify({ok:!1,error:"invalid_drawio_xml",validation:q},null,2);let L=f(H.xml),V=w6(L,F);if(V.summary.added+V.summary.removed+V.summary.changed+V.pageChanges.length===0)throw Error("candidate XML is identical to the active diagram");let P=V.changed[0]?.pageId||(V.added[0]?I6(V.added[0].key,V.added[0].cell.id):void 0)||(V.removed[0]?I6(V.removed[0].key,V.removed[0].cell.id):void 0)||V.pageChanges[0]?.pageId||F[0]?.id||L[0]?.id||"page-1",j=OJ(H,H.xml,U.xml,P,[],V);return JSON.stringify({ok:!0,dryRun:!0,file:w.relative(H.workspace,H.file).split(w.sep).join("/"),changedIds:j.changedIds,changedQualifiedIds:j.changedQualifiedIds,affectedPageIds:j.affectedPageIds,diff:V,preview:U6(j),validation:q,previewGuidance:"The exact complete-XML candidate is visible in the bound Draw.io canvas. Compare Before and After, inspect the property list, then authorize the preview."},null,2)}}),drawio_update_state:K({description:"Apply the exact complete-XML candidate from an approved drawio_preview_state preview. The candidate hash and base revision must match; a stale revision is rejected.",args:{base_revision:Q.schema.number().int().min(0),xml:Q.schema.string().min(1),annotation_id:Q.schema.string().optional().describe("Active annotation id; mandatory for an annotation-driven write"),approval_token:Q.schema.string().optional().describe("One-time token returned after drawio_authorize_annotation_change is approved"),preview_id:Q.schema.string().optional().describe("Preview id from drawio_preview_state; annotation approval may supply its linked preview"),preview_approval_token:Q.schema.string().optional().describe("Preview approval token; annotation approval_token also authorizes its linked preview")},async execute(U,X){let H=b().sessions.get(X.sessionID);if(!H)throw Error("No active Draw.io session. Call drawio_open first.");if(await c(H),U.base_revision!==H.revision)return JSON.stringify({ok:!1,error:"revision_conflict",current:K5(H),manualChanges:r8(H,U.base_revision)},null,2);if(a(U.xml)===H.fileHash)return JSON.stringify({ok:!0,...K5(H),validation:l(f(H.xml)),noOp:!0},null,2);let F=CJ(H,U.annotation_id,U.approval_token);if(F)A3(F,f(H.xml),f(U.xml));let q=U.preview_id||F?.authorization.previewId||void 0,L=d8(H,q,U.preview_approval_token||U.approval_token,U.base_revision,U.xml),V=await F8(H,U.xml,U.base_revision,"agent",null,{appliedPreviewId:L.id});if(V.conflict)return JSON.stringify({ok:!1,error:"revision_conflict",current:K5(V.current),manualChanges:V.manualChanges},null,2);if(V.invalid)return JSON.stringify({ok:!1,error:"invalid_drawio_xml",validation:V.report},null,2);if(F)await AJ(H,F);return JSON.stringify({ok:!0,...K5(V.document),validation:V.validation},null,2)}}),drawio_open:K({description:"Bind the current Draw.io session to one validated workspace file and return a URL for OpenWork's existing built-in browser.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file to open"),drawio_url:Q.schema.string().optional().describe("Draw.io Web URL; defaults to DRAWIO_WEB_URL or https://embed.diagrams.net")},async execute(U,X){let H=P5(X,U.file),F=await DJ(X,H),q=wJ(U.drawio_url?.trim()||process.env.DRAWIO_WEB_URL?.trim()||"https://embed.diagrams.net");F.session.editorUrl=q.toString();let L=`http://${F.bridge.host}:${F.bridge.port}`,V=new URL("/editor",L);V.searchParams.set("sessionId",X.sessionID),V.searchParams.set("token",F.token);let B=e8(F.session.sessionId,H);return JSON.stringify({ok:!0,file:h(X,H).split(w.sep).join("/"),sessionId:X.sessionID,revision:F.session.revision,openUrl:V.toString(),editorUrl:q.toString(),editorConnected:B,shouldOpenBrowser:!B,browserAction:B?"Keep the connected editor open. Do not call openwork_browser_open_url because reopening it can discard an in-progress manual edit.":"Call MobileWork's openwork_browser_open_url tool with url=openUrl and provider=builtin.",saveMode:"workspace-file",tokenExpiresAt:new Date(Date.now()+H8).toISOString()},null,2)}}),drawio_finalize:K({description:"Finish a Draw.io task: refresh the latest revision, validate and score it, export an up-to-date PNG, bind the browser session, and report whether a new editor must be opened. Refuses to run while any fresh (requiresConfirmation=false) annotation is still open; returns pendingAnnotations for stale open annotations that still need user confirmation. Resolved and ignored annotations are terminal and do not block finalization.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file"),output_path:Q.schema.string().optional().describe("Workspace-relative PNG path; defaults to the input basename with .png"),threshold:Q.schema.number().min(0).max(100).default(90),scale:Q.schema.number().positive().default(1),border:Q.schema.number().int().min(0).default(0),background:Q.schema.string().default(RJ).describe("PNG background color; defaults to white"),drawio_url:Q.schema.string().optional().describe("Draw.io Web URL; defaults to DRAWIO_WEB_URL or https://embed.diagrams.net")},async execute(U,X){let H=P5(X,U.file),F=k5(X,H),q=F?(await c(F)).xml:await C5(H),L=f(q),V=l(L);if(!V.valid)throw Error(`refusing to finalize invalid Draw.io XML: ${JSON.stringify(V.errors)}`);let B=m8(L,U.threshold),P=await DJ(X,H),j=[...X5(P.session).values()].filter((C)=>C.status==="open"),O=j.filter((C)=>!N6(P.session,C).requiresConfirmation);if(O.length>0)throw Error(`refusing to finalize: ${O.length} unfinished fresh annotation(s) must be handled first \u2014 `+O.map((C)=>`${C.id}: ${C.instruction.slice(0,120)}`).join(" | ")+". Handle each one (plan, get approval, write, then drawio_resolve_annotation) before calling drawio_finalize again.");let M=j.map((C)=>{let T=N6(P.session,C);return{id:C.id,instruction:C.instruction,requiresConfirmation:T.requiresConfirmation,freshness:T.freshness}}),R=await m9({context:X,inputTarget:H,xml:q,format:"png",outputPath:U.output_path,scale:U.scale,border:U.border,background:U.background,overwrite:!0}),E=wJ(U.drawio_url?.trim()||process.env.DRAWIO_WEB_URL?.trim()||"https://embed.diagrams.net");P.session.editorUrl=E.toString();let A=`http://${P.bridge.host}:${P.bridge.port}`,N=new URL("/editor",A);N.searchParams.set("sessionId",X.sessionID),N.searchParams.set("token",P.token);let D=e8(P.session.sessionId,H);return JSON.stringify({ok:!0,file:h(X,H).split(w.sep).join("/"),revision:P.session.revision,validation:V,quality:B,png:{output_path:h(X,R.outputTarget).split(w.sep).join("/"),file_size_bytes:R.bytes,content_type:R.contentType,export_url:R.exportUrl},pendingAnnotations:M,openUrl:N.toString(),editorUrl:E.toString(),editorConnected:D,shouldOpenBrowser:!D,browserAction:D?"Keep the connected editor open. Do not call openwork_browser_open_url because reopening it can discard an in-progress manual edit.":"Immediately call MobileWork's openwork_browser_open_url tool with url=openUrl and provider=builtin before ending the task.",saveMode:"workspace-file",tokenExpiresAt:new Date(Date.now()+H8).toISOString()},null,2)}}),drawio_list_annotations:K({description:"List annotation (review comment) tasks for an opened Draw.io file. Each task contains selected stable cell ids, page, region, user-selected modification scope, instruction, approval state and status.",args:{file:Q.schema.string().describe("Workspace-relative .drawio or .xml file bound to the session"),status:Q.schema.enum(["pending","open","fresh","stale","resolved","ignored","all"]).default("pending").describe("Filter by status; pending/open return all unfinished tasks, while fresh and stale refine them")},async execute(U,X){let H=P5(X,U.file),F=k5(X,H);if(!F)throw Error("No active Draw.io session for this file. Call drawio_open first.");await c(F);let L=[...X5(F).values()].map((B)=>({task:B,state:N6(F,B)})).sort((B,P)=>P.task.updatedAt.localeCompare(B.task.updatedAt)),V=L.filter((B)=>I1(B.state,U.status)).map((B)=>l5(F,B.task,B.state));return JSON.stringify({file:h(X,H).split(w.sep).join("/"),sessionId:F.sessionId,currentRevision:F.revision,count:V.length,counts:y1(L.map((B)=>B.state)),annotations:V,guidance:"Pending/open include fresh and stale unfinished tasks; resolved and ignored are terminal until the user reopens them. Ask for confirmation before executing any task with requiresConfirmation=true. For each executable task: call drawio_get_annotation and drawio_get_state, dry-run, disclose scope and exact stable IDs with drawio_authorize_annotation_change, and wait for its OpenCode approval popup. Only then pass annotation_id and the one-time approval token to one scoped write, resolve the annotation, and finalize. Never modify first and ask later."},null,2)}}),drawio_get_annotation:K({description:"Read one annotation task in full and make it the active guarded task, including selected stable cell ids, region, user-selected scope, instruction, base revision, staleness and latest per-cell snapshots.",args:{file:Q.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),id:Q.schema.string().describe("Annotation id returned by drawio_list_annotations")},async execute(U,X){let H=p8(X,U.file);if(!H)throw Error("No active Draw.io session. Call drawio_open first.");await c(H);let q=X5(H).get(U.id);if(!q)throw Error(`annotation not found: ${U.id}`);H.activeAnnotationId=q.status==="open"?q.id:null;let L=N6(H,q),V=l5(H,q,L),B=[];try{let P=f(H.xml),j=P.find((O)=>O.id===q.pageId)||P[0];if(j){let O=new Map(j.cells.map((M)=>[M.id,M]));B=q.cells.map((M)=>{let R=O.get(M.id);if(!R)return{id:M.id,missing:!0};let E=R.vertex?V5(R,S6(j.cells)):null;return{id:R.id,kind:R.edge?"edge":"node",label:R.label||"",style:R.style||"",source:R.source,target:R.target,geometry:E||null,parent:R.parent}})}}catch{}return JSON.stringify({annotation:V,cellSnapshots:B,guidance:q.status!=="open"?`This annotation is ${q.status} and terminal. Do not process it unless the user reopens it in the annotation panel.`:L.requiresConfirmation?"This annotation is stale but still open. Ask the user whether to execute it. After confirmation, call drawio_get_state, generate a dry-run canvas preview and exact changed-id plan, then call drawio_authorize_annotation_change with the preview id. Wait for the OpenCode approval popup before applying the exact hash-matched candidate; resolve only after the write succeeds.":"Call drawio_get_state, generate a dry-run canvas preview and exact changed-id plan, then call drawio_authorize_annotation_change with the preview id. After approval, apply the exact hash-matched candidate and resolve the annotation."},null,2)}}),drawio_authorize_preview:K({description:"Request approval for the exact candidate visible in the Draw.io canvas and apply it immediately when the user allows the popup. Use after drawio_patch/drawio_polish dry-run or drawio_preview_state, and only for changes that are not driven by an annotation task.",args:{file:Q.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),preview_id:Q.schema.string().describe("Preview id returned by drawio_patch/drawio_polish dry-run or drawio_preview_state"),plan:Q.schema.string().min(1).describe("Concise explanation of the visible candidate change")},async execute(U,X){let H=p8(X,U.file);if(!H)throw Error("No active Draw.io session. Call drawio_open first.");if(await c(H),S1(H))throw Error("an annotation task is active; authorize its scoped preview with drawio_authorize_annotation_change instead");let F=b().patchPreviews.get(U.preview_id);if(!F||F.sessionId!==H.sessionId||F.diagramKey!==g(H.file))throw Error("patch preview not found for this session and diagram");if(v5(H),F.status!=="pending")throw Error(`patch preview is ${F.status}; generate a fresh dry-run preview`);let q=["drawio-preview",a(F.diagramKey).slice(0,12),F.id,`revision-${F.baseRevision}`,F.candidateHash.slice(0,16)].join(":");await X.ask({permission:"drawio_authorize_preview",patterns:[q],always:[q],metadata:{file:F.file,previewId:F.id,plan:U.plan.trim(),baseRevision:F.baseRevision,candidateHash:F.candidateHash,changedIds:F.changedIds,summary:F.diff.summary}}),await c(H);let L=i5(24).toString("base64url");i9(H,F,L),d8(H,F.id,L,F.baseRevision,F.candidateXml);let V=await F8(H,F.candidateXml,F.baseRevision,"agent",null,{appliedPreviewId:F.id});if(V.conflict)return v5(H),JSON.stringify({ok:!1,applied:!1,error:"revision_conflict",current:K5(V.current),manualChanges:V.manualChanges},null,2);if(V.invalid)throw Error(`approved preview failed validation: ${JSON.stringify(V.report.errors)}`);return JSON.stringify({ok:!0,applied:!0,file:w.relative(H.workspace,H.file).split(w.sep).join("/"),revision:V.document.revision,backup:V.document.backupFile?w.relative(H.workspace,V.document.backupFile).split(w.sep).join("/"):null,validation:V.validation,preview:U6(F),guidance:"The approved preview was applied immediately. Do not call drawio_patch or drawio_polish again for this candidate; finalize the diagram if an updated export is required."},null,2)}}),drawio_authorize_annotation_change:K({description:"Request the user's pre-change approval for one annotation plan. OpenCode must show its permission popup before this tool runs. If approved, returns a one-time token bound to the current revision, declared stable IDs and requested scope. Never call after modifying the diagram.",args:{file:Q.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),id:Q.schema.string().describe("Annotation id returned by drawio_get_annotation"),plan:Q.schema.string().min(1).describe("Concrete pre-change explanation of what will be modified"),proposed_changed_ids:Q.schema.array(Q.schema.string()).min(1).describe("Complete stable-ID allowlist disclosed before writing; diagram_wide uses pageId:cellId"),requested_scope:Q.schema.enum(["selection_only","selection_and_edges","surrounding_layout","diagram_wide"]).describe("Scope needed by this plan; normally equal to or narrower than the user's annotation scope"),escalation_reason:Q.schema.string().optional().describe("Required when requesting a scope wider than the user originally selected"),preview_id:Q.schema.string().optional().describe("Preview id returned by the immediately preceding drawio_patch dry-run; defaults to the active preview")},async execute(U,X){let H=p8(X,U.file);if(!H)throw Error("No active Draw.io session. Call drawio_open first.");await c(H);let F=X5(H).get(U.id);if(!F)throw Error(`annotation not found: ${U.id}`);if(F.status!=="open")throw Error(`annotation is ${F.status} and must be reopened before authorization: ${U.id}`);let q=bJ(U.requested_scope),L=U.escalation_reason?.trim()||null;if(p9(q)>p9(F.scope)&&!L)throw Error(`scope escalation from "${I5(F.scope)}" to "${I5(q)}" requires an explicit reason shown before approval`);let V=[...new Set(U.proposed_changed_ids.map((E)=>E.trim()))].filter(Boolean);if(V.length===0)throw Error("proposed_changed_ids must contain at least one stable id");let B=k1(H,F,q),P=U.preview_id?b().patchPreviews.get(U.preview_id):v5(H);if(P){if(P.sessionId!==H.sessionId||P.diagramKey!==g(H.file))throw Error("patch preview belongs to a different session or diagram");if(v5(H),P.status!=="pending")throw Error(`patch preview is ${P.status}; generate a fresh dry-run preview`);let E=q==="diagram_wide"?new Set(P.changedQualifiedIds):new Set(P.changedIds),A=new Set(V);if(E.size!==A.size||[...E].some((N)=>!A.has(N)))throw Error("proposed_changed_ids must exactly match the stable IDs shown in the active preview")}let j=w.relative(H.workspace,H.file).split(w.sep).join("/"),O=["annotation",a(g(H.file)).slice(0,12),F.id,`revision-${H.revision}`,q,V.toSorted().join(",")].join(":");await X.ask({permission:"drawio_authorize_annotation_change",patterns:[O],always:[O],metadata:{annotationId:F.id,file:j,plan:U.plan.trim(),proposedChangedIds:V,requestedScope:q,requestedScopeLabel:I5(q),originalScope:F.scope,originalScopeLabel:I5(F.scope),escalationReason:L,baseRevision:H.revision,previewId:P?.id||null,candidateHash:P?.candidateHash||null}}),await c(H);let M=new Date().toISOString(),R={token:i5(24).toString("base64url"),sessionId:H.sessionId,diagramKey:g(H.file),scope:q,plan:U.plan.trim(),proposedChangedIds:V,escalationReason:L,baseRevision:H.revision,approvedAt:M,consumedAt:null,previewId:P?.id||null};if(H.annotationAuthorizations.set(F.id,R),P)i9(H,P,R.token);return F.updatedAt=M,H.activeAnnotationId=F.id,await V8(H),L8(H,F,"authorization-approved"),JSON.stringify({ok:!0,annotationId:F.id,approvalToken:R.token,previewId:P?.id||null,baseRevision:R.baseRevision,requestedScope:q,requestedScopeLabel:I5(q),originalScope:F.scope,originalScopeLabel:I5(F.scope),escalationReason:L,proposedChangedIds:V,allowedExistingIds:q==="diagram_wide"?[...B.allowedQualifiedIds]:[...B.allowedIds],guidance:"Approval is valid for one formal write at this exact revision. Pass annotation_id and approval_token to drawio_patch or drawio_update_state. Any undeclared or out-of-scope stable ID is rejected."},null,2)}}),drawio_resolve_annotation:K({description:"Mark an annotation task as resolved after the requested change has been written (or after deciding no change is needed). This updates status and stores a summary; it does not modify the diagram itself.",args:{file:Q.schema.string().optional().describe("Workspace-relative diagram file; defaults to the active file"),id:Q.schema.string().describe("Annotation id to resolve"),summary:Q.schema.string().describe("Short description of what was changed or why the annotation needs no change"),changed_ids:Q.schema.array(Q.schema.string()).optional().describe("Stable cell ids that were added, removed or modified for this annotation")},async execute(U,X){let H=p8(X,U.file);if(!H)throw Error("No active Draw.io session. Call drawio_open first.");await c(H);let F=X5(H),q=F.get(U.id);if(!q)throw Error(`annotation not found: ${U.id}`);if(q.status!=="open")throw Error(`annotation is ${q.status} and must be reopened before it can be resolved: ${U.id}`);let L=new Date().toISOString();return q.status="resolved",q.result={summary:U.summary,changedIds:U.changed_ids||[],revision:H.revision,updatedAt:L},q.resolvedAt=L,q.ignoredAt=null,q.ignoredReason=null,q.updatedAt=L,F.set(q.id,q),o8(H,q.id),await V8(H),L8(H,q,"updated"),JSON.stringify({ok:!0,annotation:l5(H,q)},null,2)}})};return o9.set(J,$),$}function gU(J,W){let G=I3(W)[J];if(!G)throw Error(`Unknown Draw.io tool: ${J}`);return G}export{_U as initializeDrawioWorkspace,hU as enforceDrawioWriteGuard,I3 as createDrawioToolset,gU as createDrawioTool,xU as applyDrawioSystemGuidance,uU as DRAWIO_TOOL_NAMES};

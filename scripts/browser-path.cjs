const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
function browserPath(){
 const candidates=[process.env.CHROME_PATH,process.env.CHROMIUM_PATH];
 for(const root of [process.env.ProgramFiles,process.env['ProgramFiles(x86)'],process.env.LOCALAPPDATA].filter(Boolean))candidates.push(path.join(root,'Google','Chrome','Application','chrome.exe'),path.join(root,'Microsoft','Edge','Application','msedge.exe'));
 for(const name of process.platform==='win32'?['chrome.exe','msedge.exe']:['google-chrome','chromium','chromium-browser']){try{candidates.push(...cp.execFileSync(process.platform==='win32'?'where.exe':'which',[name],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split(/\r?\n/))}catch{}}
 const result=candidates.find(value=>value&&fs.existsSync(value));
 if(!result)throw Error('Navegador Chromium não encontrado. Configure CHROME_PATH com o executável do Chrome, Chromium ou Edge instalado.');
 return result;
}
module.exports={browserPath};

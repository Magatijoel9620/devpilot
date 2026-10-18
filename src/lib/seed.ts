import type { AppData, Project, Task } from './types';
const date = new Date().toISOString().slice(0,10);
const daysFromNow = (n:number) => new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const projects: Project[] = [
 {id:'p-farmora',name:'Farmora',color:'#0F766E',status:'active',description:'Farm management, imports, reporting and billing.',lastAction:'Reviewed import and billing workflows',nextAction:'Verify the release checklist',createdAt:date},
 {id:'p-ledger',name:'Landlord Ledger',color:'#A16207',status:'active',description:'Property management, marketplace and release maintenance.',lastAction:'Reviewed marketplace work',nextAction:'Review open issues and release priorities',createdAt:date},
 {id:'p-invoice',name:'InvoiceEasy',color:'#2563EB',status:'active',description:'Invoicing, cloud sync, PDF output and payment integration.',lastAction:'Reviewed Android build requirements',nextAction:'Verify Android release build',createdAt:date},
 {id:'p-payment',name:'Payment Engine',color:'#7C3AED',status:'active',description:'Shared billing, payment verification and entitlements.',lastAction:'Reviewed gateway verification workflow',nextAction:'Run end-to-end payment checks',createdAt:date},
 {id:'p-hempon',name:'Hempon Group',color:'#DB2777',status:'active',description:'Company website, app downloads, launch and operations.',lastAction:'Reviewed launch assets',nextAction:'Check public download links',createdAt:date}
];
const task = (id:string,title:string,projectId:string,priority:Task['priority'],estimate:number,dueDate:string,impact:number,stage:Task['stage']='development'):Task => ({id,title,description:'Starter task. Confirm the current state before acting.',projectId,parentId:null,status:'todo',priority,stage,dueDate,estimate,impact,nextAction:'Review current state and define the smallest next step.',checklist:[],dependsOn:[],createdAt:date});
const tasks: Task[] = [
 task('t-invoice-build','Verify Android release build','p-invoice','high',45,daysFromNow(1),5,'testing'),
 task('t-payment-e2e','Run payment verification checks','p-payment','high',45,daysFromNow(2),5,'testing'),
 task('t-download-links','Check public app download links','p-hempon','normal',25,daysFromNow(3),4,'release'),
 task('t-farmora-import','Verify Excel import preview and rollback','p-farmora','normal',40,daysFromNow(4),4,'testing'),
 task('t-ledger-issues','Review Landlord Ledger open issues','p-ledger','normal',30,daysFromNow(5),3,'maintenance'),
 task('t-release-notes','Prepare next release notes','p-invoice','low',20,daysFromNow(7),2,'release')
];
export const starterData: AppData = {projects,tasks,sessions:[],notes:[],releases:[{id:'r-invoice',projectId:'p-invoice',version:'Next release',status:'testing',targetDate:daysFromNow(7),notes:'Confirm the actual release scope and version.',checklist:[{id:'rc1',title:'Automated tests pass',done:false},{id:'rc2',title:'Release build succeeds',done:false},{id:'rc3',title:'Install and smoke-test build',done:false},{id:'rc4',title:'Publish and verify deployment',done:false}]}],plans:{}};

#! /usr/bin/env python
# -*- coding: utf-8 -*-

import pysvn
import wx
import time
import re
import sys

def alert(txt):
    app = wx.App();
    dlg = wx.MessageDialog(None, txt,'Tips',wx.OK)
    retCode = dlg.ShowModal()
    dlg.Destroy()
    app.MainLoop()

def getJira(msg):
    jiraStr = re.findall(r'#\S*?#',msg)[0].replace('#','')
    return jiraStr

def getConfig():
    configDict = {}
    with open('./doc/svn-config.ini','r') as config:
        inis = config.readlines();
        for ini in inis:
            if not ini.startswith(';'):
                inic = ini.split('=')
                if len(inic) < 2:
                    continue
                key = ini.split('=')[0].replace(' ','').replace(';','').replace('\n','')
                value = ini.split('=')[1].replace(' ','').replace(';','').replace('\n','')
                configDict[str(key)] = str(value);
        config.close();
    return configDict

def createData(author,date,message,revision,changed_paths,tjira):
    logInfo = {}
    logInfo['author'] = author
    logInfo['date'] = date
    logInfo['message'] = message
    logInfo['revision'] = revision
    logInfo['changePath'] = changed_paths
    logInfo['jira'] = tjira
    return logInfo

def getSVNInfo(url,author,jira):
    client = pysvn.Client()
    revisionStart = pysvn.Revision(pysvn.opt_revision_kind.head)
    logList = client.log(url,revisionStart,discover_changed_paths=True)
    logInfos = []
    for log in logList:
        logInfo = {}
        if str(author).strip():
            if str(jira).strip():
                tjira = getJira(log['message'])
                if tjira == jira and log['author'] == author.upper():
                    logInfos.append(createData(log['author'],log['date'],log['message'],log['revision'],log['changed_paths'],tjira))
            else:
                if log['author'] == author.upper():
                    logInfos.append(createData(log['author'],log['date'],log['message'],log['revision'],log['changed_paths'],tjira))
        else:
            if str(jira).strip():
                tjira = getJira(log['message'])
                if tjira == jira:
                    logInfos.append(createData(log['author'],log['date'],log['message'],log['revision'],log['changed_paths'],tjira))
            else:
                tjira = getJira(log['message'])
                logInfos.append(createData(log['author'],log['date'],log['message'],log['revision'],log['changed_paths'],tjira))
    return logInfos

def writeLog(infos):
    with open('./doc/log.txt','a+') as log:
        log.truncate()
        pathList = []
        txt = 'Detail Logs:\n\n'
        typeDict = {
            'M': 'Modify',
            'A': 'Add',
            'D': 'Delete'
        }
        log.write(txt)
        length = len(infos)
        if(length <= 0):
            alert('无log写入')
        for info in infos:
            timestr = ''
            if 'date' in info and str(info['date']).strip():
                timestr = str(time.strftime('%Y:%m:%d %H:%M:%S',time.localtime(info['date'])))
            title = 'Author: %s' % info['author'].replace('\n','') + '\n'
            date = 'Date: %s' % timestr.replace('\n','') + '\n'
            msg = 'Message: %s' % info['message'].replace('\n','') + '\n'
            rev = 'Revision: %s' % str(info['revision']).replace('\n','') + ';\n'
            pathTitle = 'Paths:\n'
            paths = info['changePath']
            log.write(title+date+msg+rev+pathTitle)
            for path in paths:
                path_str = path['path']
                path_type = path['action']
                if str(path_type.strip()) and path_type in typeDict:
                    path_type_detail = typeDict[path_type]
                else:
                    path_type_detail = path_type
                pathList.append(path_str)
                log.write('    Type: %s      Path: %s\n' % (path_type_detail,path_str))
            log.write('\n')
        if len(pathList) > 0:
            pathListSingle = sorted(set(pathList),key=pathList.index)
            log.write('\n All Changed Paths:\n')
            for list in pathListSingle:
                log.write('    %s\n' % list)
        log.close()
        alert('Log 写入完成')

if __name__ == '__main__':
    configDict = getConfig()
    if 'URL' not in configDict :
        alert('无svn地址')
        sys.exit(1);
    if 'AUTHOR' not in configDict :
        configDict['AUTHOR'] = ''
    if 'JIRA' not in configDict:
        configDict['JIRA'] = ''
    svnInfo = getSVNInfo(configDict['URL'],configDict['AUTHOR'],configDict['JIRA'])
    writeLog(svnInfo)
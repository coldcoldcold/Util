#! /usr/bin/env python
# -*- coding: utf-8 -*-
#用于打包exe

from distutils.core import setup
import py2exe
setup(windows=[r'D://python-space//svn-log-path.py'],options = { "py2exe":{"dll_excludes":["MSVCP90.dll"]}})
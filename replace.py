import codecs
f = codecs.open('src/App.tsx', 'r', 'utf-8')
content = f.read()
f.close()
content = content.replace('import React from \'react\';', 'import React from \'react\';\nimport { ConnectButton } from \'@rainbow-me/rainbowkit\';')

old_btn = '''<button className='group relative px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-teal-500/50 transition-all duration-300 overflow-hidden'>\n          <div className='absolute inset-0 bg-gradient-to-r from-teal-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>\n          <span className='relative text-sm font-semibold text-teal-100 tracking-wide'>Connect Wallet</span>\n        </button>'''
content = content.replace(old_btn, '<ConnectButton />')

codecs.open('src/App.tsx', 'w', 'utf-8').write(content)

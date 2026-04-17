// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

import * as vscode from 'vscode'

const SYMBOL_PATTERNS = [
	{
		pattern: /^\s*(?:(?:Private|Public|Friend|Global)\s+)?(?:Static\s+)?(Function)\s+([^\s(]+)/i,
		endKeyword: /^\s*End\s+Function\b/i,
		kind: vscode.SymbolKind.Function,
	},
	{
		pattern: /^\s*(?:(?:Private|Public|Friend|Global)\s+)?(?:Static\s+)?(Sub)\s+([^\s(]+)/i,
		endKeyword: /^\s*End\s+Sub\b/i,
		kind: vscode.SymbolKind.Method,
	},
	{
		pattern: /^\s*(?:(?:Private|Public|Friend|Global)\s+)?(?:Static\s+)?(Property\s+(?:Get|Let|Set))\s+([^\s(]+)/i,
		endKeyword: /^\s*End\s+Property\b/i,
		kind: vscode.SymbolKind.Property,
	},
	{
		pattern: /^\s*(?:(?:Private|Public)\s+)?(Type)\s+([^\s(]+)/i,
		endKeyword: /^\s*End\s+Type\b/i,
		kind: vscode.SymbolKind.Struct,
	},
	{
		pattern: /^\s*(?:(?:Private|Public)\s+)?(Enum)\s+([^\s(]+)/i,
		endKeyword: /^\s*End\s+Enum\b/i,
		kind: vscode.SymbolKind.Enum,
	},
]

class VbaDocumentSymbolProvider {
	provideDocumentSymbols(document, token) {
		const symbols = []
		const lines = []
		for (let i = 0; i < document.lineCount; i++) {
			lines.push(document.lineAt(i).text)
		}

		let isContinuation = false
		for (let i = 0; i < lines.length; i++) {
			if (token.isCancellationRequested) return symbols
			const line = lines[i]
			const continued = /\s_\s*$/.test(line)

			if (!isContinuation) {
				for (const { pattern, endKeyword, kind } of SYMBOL_PATTERNS) {
					const match = pattern.exec(line)
					if (!match) continue

					const name = match[2]
					const nameIndex = line.indexOf(name, match.index + match[1].length)
					const selectionRange = new vscode.Range(i, nameIndex, i, nameIndex + name.length)

					let endLine = i
					for (let j = i + 1; j < lines.length; j++) {
						if (endKeyword.test(lines[j])) { endLine = j; break }
					}

					const fullRange = new vscode.Range(i, 0, endLine, lines[endLine].length)
					symbols.push(new vscode.DocumentSymbol(name, match[1].trim(), kind, fullRange, selectionRange))
					break
				}
			}
			isContinuation = continued
		}
		return symbols
	}
}

export function registerSymbolProvider(context) {
	const provider = new VbaDocumentSymbolProvider()
	const selector = [{ language: 'vba' }, { language: 'vb6' }, { language: 'wwb' }]
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, provider))
}

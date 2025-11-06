import { DiffEditor, loader } from "@monaco-editor/react"
import { useEditorStore } from "@/store"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "@/lib/theme-context"
import { FileTextIcon, GitCompareIcon } from "lucide-react"

interface MonacoDiffEditorProps {
  originalValue: string
  modifiedValue: string
  onChange?: (value: string) => void
  onSave?: () => void
  fileName?: string
  onEditorReady?: (editor: any) => void
}

export function MonacoDiffEditor({
  originalValue,
  modifiedValue,
  onChange,
  onSave,
  fileName,
  onEditorReady
}: MonacoDiffEditorProps) {
  const { fontSize, wordWrap, showLineNumbers } = useEditorStore()
  const { theme } = useTheme()
  const diffEditorRef = useRef<any>(null)
  const [monacoTheme, setMonacoTheme] = useState<string>("vs-dark")
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [totalLines, setTotalLines] = useState({ original: 0, modified: 0 })

  // Update theme based on system theme
  useEffect(() => {
    setMonacoTheme(theme === "dark" ? "vs-dark" : "vs")
  }, [theme])

  // Setup keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        onSave?.()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onSave])

  // Configure Monaco for LaTeX
  useEffect(() => {
    loader.init().then((monaco) => {
      // Register LaTeX language if not already registered
      const languages = monaco.languages.getLanguages()
      if (!languages.find((lang) => lang.id === "latex")) {
        monaco.languages.register({ id: "latex" })

        monaco.languages.setMonarchTokensProvider("latex", {
          tokenizer: {
            root: [
              // Commands
              [/\\[a-zA-Z@]+/, "keyword"],
              // Math delimiters
              [/\$\$|\$/, "string"],
              // Comments
              [/%.*$/, "comment"],
              // Braces
              [/[{}]/, "delimiter.bracket"],
              // Brackets
              [/[\[\]]/, "delimiter.square"],
            ],
          },
        })
      }
    })
  }, [])

  const handleEditorDidMount = (editor: any, monaco: any) => {
    diffEditorRef.current = editor

    // Notify parent that editor is ready
    onEditorReady?.(editor)

    // Configure diff editor settings
    editor.updateOptions({
      fontSize,
      wordWrap: wordWrap ? "on" : "off",
      lineNumbers: showLineNumbers ? "on" : "off",
      renderSideBySide: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      readOnly: false, // Allow editing the modified side
      enableSplitViewResizing: true,
      diffCodeLens: true, // Show code lens for changes
    })

    // Get modified editor to track changes
    const modifiedEditor = editor.getModifiedEditor()
    if (modifiedEditor) {
      // Update total lines
      const originalModel = editor.getOriginalEditor()?.getModel()
      const modifiedModel = modifiedEditor.getModel()
      setTotalLines({
        original: originalModel?.getLineCount() || 0,
        modified: modifiedModel?.getLineCount() || 0
      })

      // Track cursor position in modified editor
      modifiedEditor.onDidChangeCursorPosition((e: any) => {
        setCursorPosition({
          line: e.position.lineNumber,
          column: e.position.column
        })
      })

      // Track content changes for line count
      modifiedEditor.onDidChangeModelContent(() => {
        const model = modifiedEditor.getModel()
        setTotalLines(prev => ({
          ...prev,
          modified: model?.getLineCount() || 0
        }))

        // Emit change event
        onChange?.(model?.getValue() || "")
      })

      // Add comment toggle keybinding (Cmd+/ or Ctrl+/)
      modifiedEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
        const selection = modifiedEditor.getSelection()
        const model = modifiedEditor.getModel()
        if (!model || !selection) return

        const startLine = selection.startLineNumber
        const endLine = selection.endLineNumber

        // Check if all selected lines are commented
        let allCommented = true
        for (let i = startLine; i <= endLine; i++) {
          const lineContent = model.getLineContent(i).trim()
          if (lineContent && !lineContent.startsWith('%')) {
            allCommented = false
            break
          }
        }

        // Toggle comments
        const edits = []
        for (let i = startLine; i <= endLine; i++) {
          const line = model.getLineContent(i)
          const firstNonWhitespace = line.search(/\S/)

          if (allCommented) {
            // Remove comment
            const commentIndex = line.indexOf('%')
            if (commentIndex !== -1) {
              edits.push({
                range: new monaco.Range(i, commentIndex + 1, i, commentIndex + 2),
                text: ''
              })
            }
          } else {
            // Add comment
            const insertPos = firstNonWhitespace === -1 ? 1 : firstNonWhitespace + 1
            edits.push({
              range: new monaco.Range(i, insertPos, i, insertPos),
              text: '% '
            })
          }
        }

        modifiedEditor.executeEdits('toggle-comment', edits)
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor Status Bar */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-border bg-card text-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <GitCompareIcon className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{fileName || "Untitled"} (Diff View)</span>
          </div>
          <div className="text-muted-foreground">
            Line {cursorPosition.line}, Col {cursorPosition.column}
          </div>
          <div className="text-muted-foreground">
            UTF-8
          </div>
          <div className="text-muted-foreground">
            Original: {totalLines.original} lines | Modified: {totalLines.modified} lines
          </div>
        </div>
      </div>

      {/* Diff Editor */}
      <div className="flex-1">
        <DiffEditor
          height="100%"
          language="latex"
          original={originalValue}
          modified={modifiedValue}
          onMount={handleEditorDidMount}
          theme={monacoTheme}
          options={{
            fontSize,
            wordWrap: wordWrap ? "on" : "off",
            lineNumbers: showLineNumbers ? "on" : "off",
            renderSideBySide: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly: false,
            enableSplitViewResizing: true,
            diffCodeLens: true,
            tabSize: 2,
            insertSpaces: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
            },
          }}
        />
      </div>
    </div>
  )
}

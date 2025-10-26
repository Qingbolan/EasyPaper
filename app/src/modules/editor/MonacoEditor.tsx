import { Editor, loader } from "@monaco-editor/react"
import { useEditorStore } from "@/store"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "@/lib/theme-context"
import { FileTextIcon } from "lucide-react"

interface MonacoEditorProps {
  value: string
  onChange?: (value: string) => void
  onSave?: () => void
  fileName?: string
}

export function MonacoEditor({ value, onChange, onSave, fileName }: MonacoEditorProps) {
  const { fontSize, wordWrap, showLineNumbers } = useEditorStore()
  const { theme } = useTheme()
  const editorRef = useRef<any>(null)
  const [monacoTheme, setMonacoTheme] = useState<string>("vs-dark")
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [totalLines, setTotalLines] = useState(0)

  // Update theme based on system theme
  useEffect(() => {
    setMonacoTheme(theme === "dark" ? "vs-dark" : "vs")
  }, [theme])

  useEffect(() => {
    // Setup keyboard shortcuts
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
    editorRef.current = editor

    // Configure LaTeX-specific settings
    editor.updateOptions({
      fontSize,
      wordWrap: wordWrap ? "on" : "off",
      lineNumbers: showLineNumbers ? "on" : "off",
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    })

    // Update total lines
    setTotalLines(editor.getModel()?.getLineCount() || 0)

    // Track cursor position
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column
      })
    })

    // Track content changes for line count
    editor.onDidChangeModelContent(() => {
      setTotalLines(editor.getModel()?.getLineCount() || 0)
    })

    // Add comment toggle keybinding (Cmd+/ or Ctrl+/)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      const selection = editor.getSelection()
      const model = editor.getModel()
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

      editor.executeEdits('toggle-comment', [{
        range: new monaco.Range(startLine, 1, endLine + 1, 1),
        text: null,
        forceMoveMarkers: true
      }])

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

      editor.executeEdits('toggle-comment', edits)
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor Status Bar */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border bg-card text-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileTextIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{fileName || "Untitled"}</span>
          </div>
          <div className="text-muted-foreground">
            Line {cursorPosition.line}, Col {cursorPosition.column}
          </div>
          <div className="text-muted-foreground">
            UTF-8
          </div>
          <div className="text-muted-foreground">
            {totalLines} lines
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language="latex"
          value={value}
          onChange={(value) => onChange?.(value || "")}
          onMount={handleEditorDidMount}
          theme={monacoTheme}
          options={{
            fontSize,
            wordWrap: wordWrap ? "on" : "off",
            lineNumbers: showLineNumbers ? "on" : "off",
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
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

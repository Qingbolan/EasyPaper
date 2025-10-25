import { Editor, loader } from "@monaco-editor/react"
import { useEditorStore } from "@/store"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "@/lib/theme-context"

interface MonacoEditorProps {
  value: string
  onChange?: (value: string) => void
  onSave?: () => void
}

export function MonacoEditor({ value, onChange, onSave }: MonacoEditorProps) {
  const { fontSize, wordWrap, showLineNumbers } = useEditorStore()
  const { theme } = useTheme()
  const editorRef = useRef<any>(null)
  const [monacoTheme, setMonacoTheme] = useState<string>("vs-dark")

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
  }

  return (
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
  )
}

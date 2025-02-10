"use client";

import { useEffect, useRef, useState } from "react";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser, NodeSpec, DOMSerializer } from "prosemirror-model";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { wrapIn, setBlockType } from "prosemirror-commands";
import { addListNodes, wrapInList } from "prosemirror-schema-list";
import "prosemirror-view/style/prosemirror.css";
import OrderedMap from "orderedmap";
import { addColumnAfter, addColumnBefore, deleteColumn, addRowAfter, addRowBefore, deleteRow, mergeCells, splitCell, toggleHeaderCell, tableEditing } from 'prosemirror-tables';
import { columnResizing, tableNodes } from "prosemirror-tables";
import "prosemirror-tables/style/tables.css";  // Add table styles
import "@/fonts/fonts.css";
import AssetManager from "@/components/AssetManager";
//import AssetGridItem from '@/components/AssetManager/AssetGridItem'; // Ensure this path is correct

// Define a custom schema that supports styles and more HTML elements
const nodes = OrderedMap.from(basicSchema.spec.nodes);

// Update the schema to include table nodes
const tableSchema = tableNodes({
  tableGroup: "block",
  cellContent: "block+",
  cellAttributes: {
    background: {
      default: null,
      getFromDOM: dom => dom.style.backgroundColor || null,
      setDOMAttr: (value, attrs) => {
        if (value) attrs.style = (attrs.style || '') + `background-color: ${value};`
      }
    }
  }
});

const extendedSchema = new Schema({
    nodes: addListNodes(
      nodes.append({
        div: {
          content: "block+",
          group: "block",
          attrs: { 
            style: { default: "" },
            class: { default: "" }
          },
          parseDOM: [{
            tag: "div",
            getAttrs: (dom: HTMLElement) => ({
              style: dom.getAttribute("style") || "",
              class: dom.getAttribute("class") || ""
            }),
          }],
          toDOM: node => ["div", { 
            style: node.attrs.style,
            class: node.attrs.class 
          }, 0],
        },
        paragraph: {
          content: "inline*",
          group: "block",
          attrs: { 
            style: { default: "" },
            class: { default: "" }
          },
          parseDOM: [{
            tag: "p",
            getAttrs: (dom: HTMLElement) => ({
              style: dom.getAttribute("style") || "",
              class: dom.getAttribute("class") || ""
            }),
          }],
          toDOM: node => ["p", { 
            style: node.attrs.style,
            class: node.attrs.class 
          }, 0],
        },
        heading: {
          content: "inline*",
          group: "block",
          defining: true,
          attrs: { level: { default: 1 } },
          parseDOM: [
            { tag: "h1", getAttrs: () => ({ level: 1 }) },
            { tag: "h2", getAttrs: () => ({ level: 2 }) }
          ],
          toDOM: node => [`h${node.attrs.level}`, 0],
        },
        bullet_list: {
          content: "list_item+",
          group: "block",
          parseDOM: [{ tag: "ul" }],
          toDOM() { return ["ul", 0] }
        },
        ordered_list: {
          content: "list_item+",
          group: "block",
          parseDOM: [{ tag: "ol" }],
          toDOM() { return ["ol", 0] }
        },
        list_item: {
          content: "paragraph block*",
          parseDOM: [{ tag: "li" }],
          toDOM() { return ["li", 0] }
        },
        // Add table nodes
        table: tableSchema.table,
        table_row: tableSchema.table_row,
        table_cell: tableSchema.table_cell,
        table_header: tableSchema.table_header,
        code_block: {
          content: "text*",
          group: "block",
          code: true,
          defining: true,
          parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
          toDOM() { return ["pre", ["code", 0]] }
        },
        blockquote: {
          content: "block+",
          group: "block",
          defining: true,
          parseDOM: [{ tag: "blockquote" }],
          toDOM() { return ["blockquote", 0] }
        },
        check_list: {
          content: "list_item+",
          group: "block",
          parseDOM: [{ tag: "ul.check-list" }],
          toDOM() { return ["ul", { class: "check-list" }, 0] }
        },
        button: {
          inline: true,
          group: "inline",
          content: "inline*",
          attrs: { 
            style: { default: "" },
            class: { default: "" },
            onclick: { default: "" }
          },
          parseDOM: [{
            tag: "button",
            getAttrs: (dom: HTMLElement) => ({
              style: dom.getAttribute("style") || "",
              class: dom.getAttribute("class") || "",
              onclick: dom.getAttribute("onclick") || ""
            }),
          }],
          toDOM: node => ["button", { 
            style: node.attrs.style,
            class: node.attrs.class,
            onclick: node.attrs.onclick
          }, 0],
        }
      } as { [key: string]: NodeSpec }),
      "paragraph block*",
      "block"
    ),
    marks: {
      strong: {
        parseDOM: [{ tag: "strong" }, { tag: "b" }],
        toDOM() { return ["strong", 0]; }
      },
      em: {
        parseDOM: [{ tag: "em" }, { tag: "i" }],
        toDOM() { return ["em", 0]; }
      },
      underline: {
        parseDOM: [{ tag: "u" }],
        toDOM() { return ["u", 0]; }
      },
      style: {
        attrs: { style: { default: null } },
        parseDOM: [{
          tag: "span",
          getAttrs: (dom: HTMLElement) => ({
            style: dom.getAttribute("style") || "",
          }),
        }],
        toDOM(node) {
          return ["span", { style: node.attrs.style }, 0];
        }
      },
      link: {
        attrs: {
          href: { default: '' },
          title: { default: null },
          class: { default: '' },
          style: { default: '' }
        },
        inclusive: false,
        parseDOM: [{
          tag: "a",
          getAttrs(dom: HTMLElement) {
            return {
              href: dom.getAttribute("href") || '',
              title: dom.getAttribute("title"),
              class: dom.getAttribute("class") || '',
              style: dom.getAttribute("style") || ''
            }
          }
        }],
        toDOM(node) {
          return ["a", {
            ...node.attrs,
            class: `${node.attrs.class} text-blue-600 hover:text-blue-800 underline`
          }, 0]
        }
      },
      font: {
        attrs: { 
          fontFamily: { default: '' }
        },
        parseDOM: [{
          tag: "span",
          getAttrs: (dom: HTMLElement) => ({
            fontFamily: dom.style.fontFamily || ''
          })
        }],
        toDOM(node) {
          return ["span", {
            style: `font-family: ${node.attrs.fontFamily}`
          }, 0]
        }
      }
    }
  });
  

// Add type for Dispatch
type Dispatch = (tr: Transaction) => void;

// Update ToolbarButton type
type ToolbarButton = {
  label: string;
  command: ((state: EditorState, dispatch: Dispatch) => boolean) | null;
  title: string;
};

// Separate table buttons into their own array
const tableButtons: ToolbarButton[] = [
  {
    label: "Insert",
    command: (state: EditorState, dispatch: Dispatch) => {
      if (dispatch) {
        const tr = state.tr.replaceSelectionWith(
          state.schema.nodes.table.create({}, [
            state.schema.nodes.table_row.create({}, [
              state.schema.nodes.table_cell.create({}, [
                state.schema.nodes.paragraph.create()
              ])
            ])
          ])
        );
        dispatch(tr);
      }
      return true;
    },
    title: "Insert Table"
  },
  {
    label: "Add Column",
    command: addColumnAfter,
    title: "Add Column"
  },
  {
    label: "Add Row",
    command: addRowAfter,
    title: "Add Row"
  },
  {
    label: "Delete Column",
    command: deleteColumn,
    title: "Delete Column"
  },
  {
    label: "Delete Row",
    command: deleteRow,
    title: "Delete Row"
  },
  {
    label: "Merge Cells",
    command: mergeCells,
    title: "Merge Cells"
  },
  {
    label: "Split Cell",
    command: splitCell,
    title: "Split Cell"
  },
  {
    label: "Toggle Header",
    command: toggleHeaderCell,
    title: "Toggle Header"
  }
];

// Add new format buttons array
const formatButtons: ToolbarButton[] = [
  {
    label: "Paragraph",
    command: (state: EditorState, dispatch: Dispatch) => 
      setBlockType(extendedSchema.nodes.paragraph)(state, dispatch),
    title: "Change to paragraph"
  },
  {
    label: "Heading 1",
    command: (state: EditorState, dispatch: Dispatch) => 
      setBlockType(extendedSchema.nodes.heading, { level: 1 })(state, dispatch),
    title: "Change to H1"
  },
  {
    label: "Heading 2",
    command: (state: EditorState, dispatch: Dispatch) => 
      setBlockType(extendedSchema.nodes.heading, { level: 2 })(state, dispatch),
    title: "Change to H2"
  },
  {
    label: "Heading 3",
    command: (state: EditorState, dispatch: Dispatch) => 
      setBlockType(extendedSchema.nodes.heading, { level: 3 })(state, dispatch),
    title: "Change to H3"
  },
  {
    label: "Heading 4",
    command: (state: EditorState, dispatch: Dispatch) => 
      setBlockType(extendedSchema.nodes.heading, { level: 4 })(state, dispatch),
    title: "Change to H4"
  },
  {
    label: "Heading 5",
    command: (state: EditorState, dispatch: Dispatch) => 
      setBlockType(extendedSchema.nodes.heading, { level: 5 })(state, dispatch),
    title: "Change to H5"
  },
  {
    label: "Heading 6",
    command: (state: EditorState, dispatch: Dispatch) => 
      setBlockType(extendedSchema.nodes.heading, { level: 6 })(state, dispatch),
    title: "Change to H6"
  },
  {
    label: "Code Block",
    command: (state: EditorState, dispatch: Dispatch) => 
      setBlockType(extendedSchema.nodes.code_block)(state, dispatch),
    title: "Change to code block"
  },
  {
    label: "Bullet List",
    command: (state: EditorState, dispatch: Dispatch) => 
      wrapInList(extendedSchema.nodes.bullet_list)(state, dispatch),
    title: "Change to bullet list"
  },
  {
    label: "Check List",
    command: (state: EditorState, dispatch: Dispatch) => 
      wrapInList(extendedSchema.nodes.check_list)(state, dispatch),
    title: "Change to check list"
  },
  {
    label: "Block Quote",
    command: (state: EditorState, dispatch: Dispatch) => 
      wrapIn(extendedSchema.nodes.blockquote)(state, dispatch),
    title: "Change to block quote"
  },
  {
    label: "Button",
    command: (state: EditorState, dispatch: Dispatch) => {
      const button = state.schema.nodes.button.create(
        { class: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" },
        state.schema.text("Click me")
      );
      if (dispatch) {
        const tr = state.tr.replaceSelectionWith(button);
        dispatch(tr);
      }
      return true;
    },
    title: "Insert Button"
  }
];

// Add font buttons array with your specific fonts
const fontButtons: ToolbarButton[] = [
  {
    label: "Default",
    command: (state: EditorState, dispatch: Dispatch) => {
      const markType = state.schema.marks.font;
      return toggleMark(markType, { fontFamily: '' })(state, dispatch);
    },
    title: "Default Font"
  },
  {
    label: "Liberation Sans",
    command: (state: EditorState, dispatch: Dispatch) => {
      const markType = state.schema.marks.font;
      return toggleMark(markType, { fontFamily: "'Liberation Sans'" })(state, dispatch);
    },
    title: "Liberation Sans"
  },
  {
    label: "Proximanova Regular",
    command: (state: EditorState, dispatch: Dispatch) => {
      const markType = state.schema.marks.font;
      return toggleMark(markType, { fontFamily: "'Proximanova Regular'" })(state, dispatch);
    },
    title: "Proximanova Regular"
  }
];

// Remove table buttons from main toolbar and add dropdown button
const toolbarButtons: ToolbarButton[] = [
    {
      label: "B",
      command: (state: EditorState, dispatch: Dispatch) =>
        toggleMark(extendedSchema.marks.strong)(state, dispatch),
      title: "Bold",
    },
    {
      label: "I",
      command: (state: EditorState, dispatch: Dispatch) =>
        toggleMark(extendedSchema.marks.em)(state, dispatch),
      title: "Italic",
    },
    {
      label: "Format ▾",
      command: null,
      title: "Text Format"
    },
    {
      label: "Font ▾",
      command: null,
      title: "Font Family"
    },
    {
      label: "U",
      command: (state: EditorState, dispatch: Dispatch) =>
        toggleMark(extendedSchema.marks.underline)(state, dispatch),
      title: "Underline",
    },
    { label: "⮌", command: undo, title: "Undo" },
    { label: "⮎", command: redo, title: "Redo" },
    {
      label: "📷",  // Image icon
      command: null,
      title: "Insert Image"
    },
    {
      label: "Paste HTML",
      command: null,
      title: "Paste HTML Content"
    },
    {
      label: "CSS",
      command: null,
      title: "Edit CSS Styles"
    },
    {
      label: "•",
      command: (state: EditorState, dispatch: Dispatch) =>
        wrapInList(extendedSchema.nodes.bullet_list)(state, dispatch),
      title: "Bullet List"
    },
    {
      label: "1.",
      command: (state: EditorState, dispatch: Dispatch) =>
        wrapInList(extendedSchema.nodes.ordered_list)(state, dispatch),
      title: "Numbered List"
    },
    {
      label: "Table ▾",
      command: null,
      title: "Table Operations"
    }
  ];
  

// Add a unique class to the editor container
const EDITOR_CLASS = "prosemirror-editor-content";

const ProseMirrorEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [isCssModalOpen, setIsCssModalOpen] = useState(false);
  const [cssContent, setCssContent] = useState("");
  const [styleElement, setStyleElement] = useState<HTMLStyleElement | null>(null);
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isAssetManagerOpen, setIsAssetManagerOpen] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    const content = document.createElement("div");
    content.innerHTML = "<p>Start typing here...</p>";

    // Create ProseMirror state with table plugins
    const state = EditorState.create({
      doc: DOMParser.fromSchema(extendedSchema).parse(content),
      plugins: [
        history(),
        keymap(baseKeymap),
        columnResizing(),
        tableEditing()
      ],
    });

    // Store state for toolbar control
    setEditorState(state);

    // Initialize ProseMirror editor
    viewRef.current = new EditorView(editorRef.current, {
      state,
      dispatchTransaction(transaction) {
        const newState = viewRef.current?.state.apply(transaction);
        if (newState) {
          viewRef.current?.updateState(newState);
          setEditorState(newState);
        }
      },
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []);

  // Create style element on mount
  useEffect(() => {
    const style = document.createElement('style');
    document.head.appendChild(style);
    setStyleElement(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Update CSS when it changes
  useEffect(() => {
    if (styleElement) {
      // Process CSS rules
      const scopedCss = cssContent
        .split('}')
        .map(rule => {
          if (!rule.trim()) return '';
          const [selectors, styles] = rule.split('{');
          
          // Handle multiple selectors (comma-separated)
          return selectors.split(',')
            .map(selector => {
              selector = selector.trim();
              if (!selector) return '';
              
              // If it's already a class selector (starts with .), just scope it
              if (selector.startsWith('.')) {
                return `.${EDITOR_CLASS} ${selector} { ${styles} }`;
              }
              
              // For element selectors, create two rules:
              // 1. Direct element selector
              // 2. Element with any class
              return `
                .${EDITOR_CLASS} ${selector} { ${styles} }
                .${EDITOR_CLASS} ${selector}[class] { ${styles} }
              `;
            })
            .join('\n');
        })
        .join('\n');
      
      styleElement.textContent = scopedCss;
    }
  }, [cssContent, styleElement]);

  // Add this function to get HTML from editor
  const getEditorHtml = () => {
    if (!viewRef.current) return "";
    const content = DOMSerializer
      .fromSchema(extendedSchema)
      .serializeFragment(viewRef.current.state.doc.content);
    
    const tmp = document.createElement("div");
    tmp.appendChild(content);
    return tmp.innerHTML;
  };

  // Update handleButtonClick to handle both HTML and CSS modals
  const handleButtonClick = (command: ((state: EditorState, dispatch: Dispatch) => boolean) | null, label?: string) => {
    if (command === null) {
      if (label === "CSS") {
        setIsCssModalOpen(true);
      } else if (label === "📷") {  // Check for the image icon
        setIsAssetManagerOpen(true);
      } else if (label === "Paste HTML") {
        setHtmlContent(getEditorHtml());
        setIsModalOpen(true);
      }
      return;
    }

    if (!editorState || !viewRef.current) return;
    command(editorState, viewRef.current.dispatch);
    viewRef.current.focus();
  };

  const handleHtmlSubmit = () => {
    if (!viewRef.current || !htmlContent.trim()) return;
  
    const tempElement = document.createElement("div");
    tempElement.innerHTML = htmlContent; // Keep user's provided HTML as-is
  
    const state = EditorState.create({
      doc: DOMParser.fromSchema(extendedSchema).parse(tempElement),
      plugins: [history(), keymap(baseKeymap)],
    });
  
    viewRef.current.updateState(state);
    setEditorState(state);
    setIsModalOpen(false);
    setHtmlContent(""); // Clear input field after insertion
  };
  
  const handleAssetSelect = (asset: { url: string, name: string }) => {
    if (!viewRef.current) return;

    const imageNode = viewRef.current.state.schema.nodes.image.create({
      src: sessionStorage.getItem(asset.url) || asset.url,
      alt: asset.name,
      title: asset.name
    });

    const tr = viewRef.current.state.tr.replaceSelectionWith(imageNode);
    viewRef.current.dispatch(tr);
    setIsAssetManagerOpen(false);
  };

  return (
    <div className="border border-gray-300 p-4 w-full max-w-2xl rounded shadow-md bg-white">
      {/* Toolbar */}
      <div className="flex space-x-2 mb-4">
        {toolbarButtons.map((btn, index) => (
          <div key={index} className="relative">
            <button
              onClick={() => {
                if (btn.label === "Format ▾") {
                  setIsFormatDropdownOpen(!isFormatDropdownOpen);
                } else if (btn.label === "Table ▾") {
                  setIsTableDropdownOpen(!isTableDropdownOpen);
                } else if (btn.label === "Font ▾") {
                  setIsFontDropdownOpen(!isFontDropdownOpen);
                } else {
                  handleButtonClick(btn.command, btn.label);
                }
              }}
              className="px-3 py-2 border rounded hover:bg-gray-100"
              title={btn.title}
            >
              {btn.label}
            </button>
            
            {btn.label === "Table ▾" && isTableDropdownOpen && (
              <div className="absolute right-0 mt-1 bg-white border rounded shadow-lg py-1 z-10">
                {tableButtons.map((tableBtn, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleButtonClick(tableBtn.command);
                      setIsTableDropdownOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    title={tableBtn.title}
                  >
                    {tableBtn.label}
                  </button>
                ))}
              </div>
            )}

            {btn.label === "Format ▾" && isFormatDropdownOpen && (
              <div className="absolute left-0 mt-1 bg-white border rounded shadow-lg py-1 z-10 min-w-[200px]">
                {formatButtons.map((formatBtn, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleButtonClick(formatBtn.command);
                      setIsFormatDropdownOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    title={formatBtn.title}
                  >
                    {formatBtn.label}
                  </button>
                ))}
              </div>
            )}

            {btn.label === "Font ▾" && isFontDropdownOpen && (
              <div className="absolute left-0 mt-1 bg-white border rounded shadow-lg py-1 z-10 min-w-[200px]">
                {fontButtons.map((fontBtn, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleButtonClick(fontBtn.command);
                      setIsFontDropdownOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    title={fontBtn.title}
                    style={{ fontFamily: fontBtn.label === "Default" ? "" : fontBtn.label }}
                  >
                    {fontBtn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add the unique class to the editor container */}
      <div className={EDITOR_CLASS}>
        <div ref={editorRef} className="min-h-[200px] p-2 focus:outline-none" />
      </div>

      {/* HTML Paste Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl">
            <h2 className="text-xl font-bold mb-4">Paste HTML Content</h2>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="w-full h-48 p-2 border rounded mb-4"
              placeholder="Paste your HTML content here..."
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setHtmlContent("");
                }}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleHtmlSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Insert HTML
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Modal */}
      {isCssModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl">
            <h2 className="text-xl font-bold mb-4">Edit CSS Styles</h2>
            <textarea
              value={cssContent}
              onChange={(e) => setCssContent(e.target.value)}
              className="w-full h-48 p-2 border rounded mb-4 font-mono"
              placeholder="Enter your CSS here... (e.g., p { color: blue; })"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCssModalOpen(false)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Manager */}
      {isAssetManagerOpen && (
        <AssetManager
          isOpen={isAssetManagerOpen}
          onClose={() => setIsAssetManagerOpen(false)}
          onSelect={handleAssetSelect}
          mode="image"
        />
      )}
    </div>
  );
};

export default ProseMirrorEditor;

"use client";

import { useEffect, useRef, useState } from "react";
import { EditorState, Transaction, Plugin } from "prosemirror-state";
import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
import { Schema, DOMParser, NodeSpec, DOMSerializer } from "prosemirror-model";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, toggleMark, setBlockType, wrapIn } from "prosemirror-commands";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes, wrapInList } from "prosemirror-schema-list";
import { addColumnAfter, addColumnBefore, deleteColumn, addRowAfter, addRowBefore, deleteRow, mergeCells, splitCell, toggleHeaderCell, tableEditing } from 'prosemirror-tables';
import { columnResizing, tableNodes } from "prosemirror-tables";
import OrderedMap from "orderedmap";
import "prosemirror-view/style/prosemirror.css";
import "prosemirror-tables/style/tables.css";
import "@/fonts/fonts.css";
import AssetManager from "../AssetManager/AssetManager";
import "prosemirror-image-plugin/dist/styles/common.css";
import "prosemirror-image-plugin/dist/styles/withResize.css";
import "@/components/ProseMirrorEditor/styles.css";
import ColorPicker from "./ColorPicker";

const EDITOR_CLASS = "prosemirror-editor-container";

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
        if (value) {
          attrs.style = `${attrs.style || ""}background-color: ${value};`;
        }
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
            class: node.attrs.class,
            "data-inherit-color": "true"
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
        },
        header: {
          content: "block+",
          group: "block",
          attrs: { 
            style: { default: "" },
            class: { default: "" }
          },
          parseDOM: [{
            tag: "header",
            getAttrs: (dom: HTMLElement) => ({
              style: dom.getAttribute("style") || "",
              class: dom.getAttribute("class") || ""
            }),
          }],
          toDOM(node) { 
            return ["header", { 
              style: node.attrs.style,
              class: node.attrs.class,
              "data-inherit-color": "true"
            }, 0];
          }
        },
        nav: {
          content: "block+",
          group: "block",
          attrs: { 
            style: { default: "" },
            class: { default: "" }
          },
          parseDOM: [{
            tag: "nav",
            getAttrs: (dom: HTMLElement) => ({
              style: dom.getAttribute("style") || "",
              class: dom.getAttribute("class") || ""
            })
          }],
          toDOM(node) { 
            return ["nav", { 
              style: node.attrs.style,
              class: node.attrs.class 
            }, 0];
          }
        },
        footer: {
          content: "block+",
          group: "block",
          parseDOM: [{ tag: "footer" }],
          toDOM() { return ["footer", 0] }
        },
        article: {
          content: "block+",
          group: "block",
          attrs: {
            class: { default: "" }
          },
          parseDOM: [{
            tag: "article",
            getAttrs: (dom: HTMLElement) => ({
              class: dom.getAttribute("class") || ""
            })
          }],
          toDOM(node) { return ["article", { class: node.attrs.class }, 0] }
        },
        ul: {
          content: "li+",
          group: "block",
          attrs: { class: { default: "" } },
          parseDOM: [{
            tag: "ul",
            getAttrs: (dom: HTMLElement) => ({
              class: dom.getAttribute("class") || ""
            })
          }],
          toDOM(node) { return ["ul", { class: node.attrs.class }, 0] }
        },
        li: {
          content: "inline*",
          inline: true,
          group: "inline",
          attrs: { class: { default: "" } },
          parseDOM: [{
            tag: "li",
            getAttrs: (dom: HTMLElement) => ({
              class: dom.getAttribute("class") || ""
            })
          }],
          toDOM(node) { return ["li", { class: node.attrs.class }, 0] }
        },
        h1: {
          content: "inline*",
          group: "block",
          attrs: { 
            style: { default: "" },
            class: { default: "" }
          },
          parseDOM: [{
            tag: "h1",
            getAttrs: (dom: HTMLElement) => ({
              style: dom.getAttribute("style") || "",
              class: dom.getAttribute("class") || ""
            })
          }],
          toDOM(node) { 
            return ["h1", { 
              style: node.attrs.style,
              class: node.attrs.class,
              "data-inherit-color": "true"
            }, 0];
          }
        },
        p: {
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
            })
          }],
          toDOM(node) { 
            return ["p", { 
              style: node.attrs.style,
              class: node.attrs.class,
              "data-inherit-color": "true"
            }, 0];
          }
        },
        image: {
          inline: true,
          attrs: {
            src: { default: '' },
            alt: { default: '' },
            title: { default: '' },
            width: { default: null },
            style: { default: '' }
          },
          group: "inline",
          draggable: true,
          parseDOM: [{
            tag: "img",
            getAttrs(dom: HTMLElement) {
              return {
                src: dom.getAttribute("src") || "",
                alt: dom.getAttribute("alt") || "",
                title: dom.getAttribute("title") || "",
                width: dom.getAttribute("width") || null,
                style: dom.getAttribute("style") || ""
              };
            }
          }],
          toDOM(node) {
            const attrs = {...node.attrs};
            if (!attrs.style && attrs.width) {
              attrs.style = `width: ${attrs.width}px`;
            }
            return ["div", { class: "image-wrapper" }, 
              ["img", attrs],
              ["div", { class: "resize-handle" }]
            ];
          }
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
      },
      textColor: {
        attrs: { color: { default: '' } },
        parseDOM: [{
          style: 'color',
          getAttrs: (value) => ({ color: value })
        }],
        toDOM(mark) {
          return ['span', { style: `color: ${mark.attrs.color} !important` }, 0];
        }
      },
      backgroundColor: {
        attrs: { color: { default: '' } },
        parseDOM: [{
          style: 'background-color',
          getAttrs: (value) => ({ color: value })
        }],
        toDOM(mark) {
          return ['span', { style: `background-color: ${mark.attrs.color} !important` }, 0];
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

// Add this function before your ProseMirrorEditor component
const createImageResizePlugin = () => {
  return new Plugin({
    props: {
      handleDOMEvents: {
        mousedown: (view, event) => {
          const target = event.target as HTMLElement;
          if (target.classList.contains('resize-handle')) {
            const wrapper = target.parentElement;
            const img = wrapper?.querySelector('img') as HTMLImageElement;
            if (!img) return false;

            let startX = event.pageX;
            let startWidth = img.width;
            
            // Find the image node position
            const pos = view.posAtDOM(wrapper!, 0);
            if (pos === null) return false;
            
            const node = view.state.doc.nodeAt(pos);
            if (!node) return false;

            img.classList.add('resize-cursor');

            const onMouseMove = (e: MouseEvent) => {
              const currentX = e.pageX;
              const diffX = currentX - startX;
              const newWidth = Math.max(60, startWidth + diffX);
              
              try {
                const tr = view.state.tr.setNodeMarkup(pos, null, {
                  ...node.attrs,
                  width: newWidth,
                  style: `width: ${newWidth}px`
                });
                view.dispatch(tr);
              } catch (error) {
                console.error('Error updating image size:', error);
              }
            };

            const onMouseUp = () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
              img.classList.remove('resize-cursor');
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            event.preventDefault();
            return true;
          }
          return false;
        }
      }
    }
  });
};

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

  // Add new state variables for color picker
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState({ top: 0, left: 0 });

  // Define table commands first
  const insertTable = (state: EditorState, dispatch: Dispatch) => {
    const tr = state.tr.replaceSelectionWith(
      state.schema.nodes.table.create({}, [
        state.schema.nodes.table_row.create({}, [
          state.schema.nodes.table_cell.create(),
          state.schema.nodes.table_cell.create(),
          state.schema.nodes.table_cell.create()
        ]),
        state.schema.nodes.table_row.create({}, [
          state.schema.nodes.table_cell.create(),
          state.schema.nodes.table_cell.create(),
          state.schema.nodes.table_cell.create()
        ]),
        state.schema.nodes.table_row.create({}, [
          state.schema.nodes.table_cell.create(),
          state.schema.nodes.table_cell.create(),
          state.schema.nodes.table_cell.create()
        ])
      ])
    );
    if (dispatch) dispatch(tr);
    return true;
  };

  // Then define toolbar buttons
  const toolbarButtons = [
    {
      label: "↶",
      command: undo,
      title: "Undo"
    },
    {
      label: "↷",
      command: redo,
      title: "Redo"
    },
    {
      label: "B",
      command: toggleMark(extendedSchema.marks.strong),
      title: "Bold"
    },
    {
      label: "I",
      command: toggleMark(extendedSchema.marks.em),
      title: "Italic"
    },
    {
      label: "U",
      command: toggleMark(extendedSchema.marks.underline),
      title: "Underline"
    },
    {
      label: "Format ▾",
      command: null,
      title: "Text formatting options"
    },
    {
      label: "Table ▾",
      command: null,
      title: "Table options"
    },
    {
      label: "Font ▾",
      command: null,
      title: "Font options"
    },
    {
      label: "📷",
      command: null,
      title: "Insert image"
    },
    {
      label: "Paste HTML",
      command: null,
      title: "Paste HTML content"
    },
    {
      label: "CSS",
      command: null,
      title: "Edit CSS"
    }
  ];

  // Then format buttons
  const formatButtons = [
    {
      label: "Paragraph",
      command: setBlockType(extendedSchema.nodes.paragraph),
      title: "Change to paragraph"
    },
    {
      label: "Heading 1",
      command: setBlockType(extendedSchema.nodes.heading, { level: 1 }),
      title: "Change to heading 1"
    },
    {
      label: "Heading 2",
      command: setBlockType(extendedSchema.nodes.heading, { level: 2 }),
      title: "Change to heading 2"
    },
    {
      label: "Bullet List",
      command: wrapInList(extendedSchema.nodes.bullet_list),
      title: "Wrap in bullet list"
    },
    {
      label: "Numbered List",
      command: wrapInList(extendedSchema.nodes.ordered_list),
      title: "Wrap in numbered list"
    },
    {
      label: "Blockquote",
      command: wrapIn(extendedSchema.nodes.blockquote),
      title: "Wrap in block quote"
    }
  ];

  // Then table buttons
  const tableButtons = [
    {
      label: "Insert Table",
      command: insertTable,
      title: "Insert table"
    },
    {
      label: "Add Column Before",
      command: addColumnBefore,
      title: "Add column before"
    },
    {
      label: "Add Column After",
      command: addColumnAfter,
      title: "Add column after"
    },
    {
      label: "Delete Column",
      command: deleteColumn,
      title: "Delete column"
    },
    {
      label: "Add Row Before",
      command: addRowBefore,
      title: "Add row before"
    },
    {
      label: "Add Row After",
      command: addRowAfter,
      title: "Add row after"
    },
    {
      label: "Delete Row",
      command: deleteRow,
      title: "Delete row"
    },
    {
      label: "Merge Cells",
      command: mergeCells,
      title: "Merge cells"
    },
    {
      label: "Split Cell",
      command: splitCell,
      title: "Split cell"
    },
    {
      label: "Toggle Header",
      command: toggleHeaderCell,
      title: "Toggle header"
    }
  ];

  // Then font buttons
  const fontButtons = [
    {
      label: "Liberation Sans",
      command: (state: EditorState, dispatch: Dispatch) => {
        return toggleMark(extendedSchema.marks.font, { fontFamily: "'Liberation Sans'" })(state, dispatch);
      },
      title: "Liberation Sans Font"
    },
    {
      label: "Proximanova Regular",
      command: (state: EditorState, dispatch: Dispatch) => {
        return toggleMark(extendedSchema.marks.font, { fontFamily: "'Proximanova Regular'" })(state, dispatch);
      },
      title: "Proximanova Regular Font"
    }
  ];

  // Then color buttons
  const colorButtons = [
    {
      label: "Text Color",
      command: (color: string) => (state: EditorState, dispatch: Dispatch) => {
        return toggleMark(state.schema.marks.textColor, { color })(state, dispatch);
      },
      onClick: (e: React.MouseEvent) => {
        setColorPickerPosition({ top: e.clientY + 10, left: e.clientX });
        setShowTextColorPicker(true);
      },
      title: "Change Text Color"
    },
    {
      label: "Highlight",
      command: (color: string) => (state: EditorState, dispatch: Dispatch) => {
        return toggleMark(state.schema.marks.backgroundColor, { color })(state, dispatch);
      },
      onClick: (e: React.MouseEvent) => {
        setColorPickerPosition({ top: e.clientY + 10, left: e.clientX });
        setShowBgColorPicker(true);
      },
      title: "Highlight Text"
    }
  ];

  useEffect(() => {
    if (editorRef.current) {
      const plugins = [
        history(),
        keymap(baseKeymap),
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
          "Mod-Shift-z": redo
        }),
        createImageResizePlugin(),
        tableEditing(),
        columnResizing()
      ];

      const state = EditorState.create({
        doc: DOMParser.fromSchema(extendedSchema).parse(editorRef.current),
        plugins
      });

      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction: (tr: Transaction) => {
          const newState = view.state.apply(tr);
          view.updateState(newState);
          setEditorState(newState);
        }
      });

      viewRef.current = view;
      setEditorState(state);
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
      }
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
      const scopedCss = cssContent
        .split('}')
        .map(rule => {
          if (!rule.trim()) return '';
          const [selectors, styles] = rule.split('{');
          
          return selectors.split(',')
            .map(selector => {
              selector = selector.trim();
              if (!selector) return '';
              
              // Handle nested selectors with inheritance
              if (selector.includes(' ')) {
                const parts = selector.split(' ');
                const parentSelector = parts[0];
                const childSelector = parts.slice(1).join(' ');
                
                return `
                  .${EDITOR_CLASS} ${selector} { ${styles} !important; }
                  .${EDITOR_CLASS} ${parentSelector}[data-inherit-color="true"] ${childSelector} { color: inherit !important; }
                `;
              }
              
              return `.${EDITOR_CLASS} ${selector} { ${styles} !important; }`;
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
      src: asset.url,
      alt: asset.name,
      title: asset.name
    });

    const tr = viewRef.current.state.tr.replaceSelectionWith(imageNode);
    viewRef.current.dispatch(tr);
    setIsAssetManagerOpen(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden max-w-4xl mx-auto">
      {/* Toolbar */}
      <div className="editor-toolbar">
        {toolbarButtons.map((btn, index) => (
          <div key={index} className="relative">
            <button
              onClick={() => {
                // Close all dropdowns first
                setIsFormatDropdownOpen(false);
                setIsTableDropdownOpen(false);
                setIsFontDropdownOpen(false);
                
                // Then open the selected one
                if (btn.label === "Format ▾") {
                  setIsFormatDropdownOpen(true);
                } else if (btn.label === "Table ▾") {
                  setIsTableDropdownOpen(true);
                } else if (btn.label === "Font ▾") {
                  setIsFontDropdownOpen(true);
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
                  >
                    {fontBtn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {colorButtons.map((btn, index) => (
          <button
            key={index}
            onClick={(e) => btn.onClick(e)}
            className="px-3 py-2 border rounded hover:bg-gray-100"
            title={btn.title}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Add the unique class to the editor container */}
      <div className={EDITOR_CLASS}>
        <div ref={editorRef} className="min-h-[200px] p-2 focus:outline-none" />
      </div>

      {/* HTML Paste Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center modal-overlay">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center modal-overlay">
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
        <div className="modal-overlay">
          <AssetManager
            isOpen={isAssetManagerOpen}
            onClose={() => setIsAssetManagerOpen(false)}
            onSelect={handleAssetSelect}
            mode="image"
          />
        </div>
      )}

      {/* Add color pickers */}
      {showTextColorPicker && (
        <div style={{ position: 'absolute', ...colorPickerPosition }}>
          <ColorPicker
            title="Select Text Color"
            onColorSelect={(color) => {
              handleButtonClick(colorButtons[0].command(color));
              setShowTextColorPicker(false);
            }}
            onClose={() => setShowTextColorPicker(false)}
            initialColor="#000000"
          />
        </div>
      )}

      {showBgColorPicker && (
        <div style={{ position: 'absolute', ...colorPickerPosition }}>
          <ColorPicker
            title="Select Highlight Color"
            onColorSelect={(color) => {
              handleButtonClick(colorButtons[1].command(color));
              setShowBgColorPicker(false);
            }}
            onClose={() => setShowBgColorPicker(false)}
            initialColor="#ffeb3b"
          />
        </div>
      )}
    </div>
  );
};

export default ProseMirrorEditor;

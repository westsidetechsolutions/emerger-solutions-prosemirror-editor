import { EditorState, Transaction } from "prosemirror-state";
import { toggleMark } from "prosemirror-commands";

type Dispatch = (tr: Transaction) => void;

export const setFontSize = (size: number) => (state: EditorState, dispatch: Dispatch) => {
  const { from, to, empty } = state.selection;
  const mark = state.schema.marks.fontSize;
  if (!mark) return false;
  
  if (empty) {
    // When no text is selected, store the mark for the next input
    const tr = state.tr.addStoredMark(mark.create({ size: `${size}px` }));
    if (dispatch) dispatch(tr);
    return true;
  } else {
    // When text is selected, apply the mark to the selection
    const tr = state.tr.addMark(from, to, mark.create({ size: `${size}px` }));
    if (dispatch) dispatch(tr);
    return true;
  }
};

// Add text alignment commands
export const setTextAlign = (alignment: 'left' | 'center' | 'right') => (state: EditorState, dispatch: Dispatch) => {
  const { from, to } = state.selection;
  
  const tr = state.tr;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.attrs && node.attrs.textAlign !== undefined) {
      tr.setNodeMarkup(pos, null, { 
        ...node.attrs, 
        textAlign: alignment 
      });
    }
    return true;
  });
  
  if (dispatch) dispatch(tr);
  return true;
}; 
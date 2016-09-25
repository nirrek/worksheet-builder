import React from 'react';
import { EditorState/*, Selection */ } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { schema as schemaBasic, marks } from 'prosemirror-schema-basic';
import history from 'prosemirror-history';
import { Schema } from 'prosemirror-model';
import { keymap } from 'prosemirror-keymap';
import { InputRule, inputRules } from 'prosemirror-inputrules';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import '../node_modules/prosemirror-view/style/prosemirror.css';
import './Editor.css';
import '../node_modules/mathquill/build/mathquill.css';
import '../node_modules/mathquill/build/mathquill.js';

let id = 1;
const latexPlaceholder = '3 + 5';

const latexInlineSpec = {
  attrs: {
    id: { default: NaN }
  },
  inline: true,
  group: 'inline',
  toDOM: node => {
    const span = document.createElement('span');
    const latexMark = node.marks.find(mark => mark.type.name === 'latexMark');
    span.innerHTML = latexMark ? latexMark.attrs.latex : latexPlaceholder;
    span.setAttribute('data-id', node.attrs.id);
    const MQ = window.MathQuill.getInterface(2);
    MQ.StaticMath(span, {});
    return span;
  },
  // selectable: false,
};

const schema = new Schema({
  nodes: schemaBasic.nodeSpec.addBefore('image', 'latexInline', latexInlineSpec),
  marks: {
    ...marks,
    latexMark: {
      attrs: {
        latex: {}
      },
      toDOM: node => ['span'],
    }
  }
});

const latexInlineType = schema.nodes.latexInline;
const latexInlineInputRule = new InputRule(
  /\$$/,
  (state, match, start, end) => state.tr
    .replaceWith(start, end, latexInlineType.create({ id: id++ }))
);

export default class Editor extends React.Component {
  state = {
    isLatexInlineSelected: false,
    latex: '',
  };

  componentDidMount() {
    const view = this.view = new EditorView(this.node, {
      state: EditorState.create({
        schema,
        plugins: [
          history.history,
          keymap({
            ...baseKeymap,
            'Mod-Z': history.undo,
            'Mod-Shift-Z': history.redo,
            'Mod-B': toggleMark(schema.marks.strong),
            'Mod-I': toggleMark(schema.marks.em),
          }),
          inputRules({
            rules: [
              latexInlineInputRule,
            ]
          })
        ],
      }),

      onAction: (action) => {
        if (action.selection && action.selection.node && action.selection.node.type.name === 'latexInline') {
          const mark = action.selection.node.marks[0];
          this.setState({
            isLatexInlineSelected: true,
            latex: mark ? mark.attrs.latex : latexPlaceholder,
          });
        } else if (this.state.isLatexInlineSelected) {
          this.setState({ isLatexInlineSelected: false });
        }

        const nextState = view.state.applyAction(action);
        view.updateState(nextState);
      },
    });
  }

  updateLatex = (latex) => {
    this.setState({ latex });

    const view = this.view;
    const { from, to } = view.state.selection;
    let state = view.state;
    if (state.doc.rangeHasMark(from, to, schema.marks.latexMark)) {
      state = state.applyAction(
        state.tr.removeMark(from, to, schema.marks.latexMark).action()
      );
    }
    state = state.applyAction(
      state.tr.addMark(from, to, schema.marks.latexMark.create({ latex })).action()
    );

    view.updateState(state);
  }

  render() {
    return (
      <div>
        <div style={{ margin: 20, minHeight: 31 }}>
          {this.state.isLatexInlineSelected && (
            <MathQuillInput defaultValut={this.state.latex} onChange={this.updateLatex} />
          )}
        </div>
        <div ref={node => this.node = node} />
      </div>
    );
  }
}

class MathQuillInput extends React.Component {
  initMathQuillField = (node) => {
    const MQ = window.MathQuill.getInterface(2);
    const field = MQ.MathField(node, {
      handlers: {
        edit: () => {
          this.props.onChange(field.latex());
        }
      }
    });
  }

  shouldComponentUpdate() {
    return false;
  }

  render() {
    return <span ref={this.initMathQuillField}>{this.props.defaultValut}</span>;
  }
}

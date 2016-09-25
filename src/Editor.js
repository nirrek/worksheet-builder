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

const owlImageSpec = {
  attrs: {
    url: {
      default: 'https://prosemirror.net/img/logo.png'
    },
    latex: {
      default: 'ax^2 + bx + c + 7'
    },
    id: {
      default: NaN,
    }
  },
  inline: true,
  group: 'inline',
  // toDOM: node => [
  //   'div', {
  //     owlImage: true,
  //     style: `display: inline-block; background: red; width: 100px; height: 100px`,
  //   },
  //   ['div', {
  //     style: `width: 50px; height: 50px; background: yellow`,
  //   },
  //     ['input', {
  //       type: 'text',
  //       style: `width: 25px; height: 25px; background: rebeccapurple`,
  //     }]
  //   ]
  // ],
  toDOM: node => {
    console.log('RENDER OWL', node.marks);
    const span = document.createElement('span');
    const crazyMark = node.marks.find(mark => mark.type.name === 'crazyDiv');
    console.log('crazyMark', crazyMark);
    span.innerHTML = crazyMark ? crazyMark.attrs.latex : '3 + 5';
    span.setAttribute('data-id', node.attrs.id);
    // span.contenteditable = false;
    const MQ = window.MathQuill.getInterface(2);
    MQ.StaticMath(span, {});
    return span;
  },
  parseDOM: [{
    tag: 'div[owlImage]',
    getAttrs: dom => ({ url: dom.getAttribute('url') }),
  }],
  // selectable: false,
};

const schema = new Schema({
  nodes: schemaBasic.nodeSpec.addBefore('image', 'owlImage', owlImageSpec),
  marks: {
    ...marks,
    crazyDiv: {
      attrs: {
        latex: { default: 'z^2' }
      },
      toDOM(node) {
        return ['span'];
        // return (
        //   ['div', { style: `display: inline-block; width: 100px; height: 100px; background: cornflowerblue;`},
        //     ['div', { style: `display: inline-block; width: 50px; height: 50px; background: yellow;`},
        //       ['div', { style: `display: inline-block; width: 25px; height: 25px; background: rebeccapurple`}]]]
        // );
      }
    }
  }
});
console.log(schema);

const owlImageType = schema.nodes.owlImage;
console.log('owlImageType', owlImageType);
const owlImageInputRule = new InputRule(
  /o$/,
  (state, match, start, end) => state.tr
    .replaceWith(start, end, owlImageType.create({ id: id++ }))
);

const kerrinInputRule = new InputRule(
  /ke$/,
  'KERRIN'
);

export default class Editor extends React.Component {
  state = {
    isOwlActive: false,
    latex: '',
  };

  componentDidMount() {
    const view = this.view = new EditorView(this.node, {
      state: EditorState.create({
        schema,
        plugins: [
          history.history,
          keymap(baseKeymap),
          inputRules({
            rules: [
              kerrinInputRule,
              owlImageInputRule,
            ]
          })
        ],
      }),

      // TODO figure out how onAction is injected into the various
      // 'command functions' that we can use.
      // This is injected into 'command functions' not sure how though.
      onAction: (action, ...rest) => {
        console.log('ACTION', action);

        if (action.selection && action.selection.node && action.selection.node.type.name === 'owlImage') {
          console.log('owl', action.selection.node);

          console.log('setStat?', this.setState);
          this.setState({ isOwlActive: true, latex: '' }, () => console.log('SET!'));
          // Why not just REPLACE the node with the new node with the new contents.
          // const nextNode = owlImageType.create({ id: id++, latex: '\\frac{1}{3}' })
          // setTimeout(() => view.updateState(
          //   view.state.applyAction(
          //     view.state.tr.replaceSelection(nextNode).action()
          //   )
          // ), 1000);
        } else {
          if (this.state.isOwlActive) this.setState({ isOwlActive: false });
        }


        // if (action.selection && action.selection.node && action.selection.node.type.name === 'owlImage') {
        //   // console.log('onOWL');
        //   // const id = action.selection.node.attrs.id;
        //   // const node = document.querySelector(`[data-id='${id}']`);
        //   // const { top, left, width, height } = node.getBoundingClientRect();
        //   // const div = document.createElement('div');
        //   // div.setAttribute('style', `
        //   //   position: absolute;
        //   //   top: ${top}px;
        //   //   left: ${left}px;
        //   //   width: ${width}px;
        //   //   height: ${height}px;
        //   //   background: red;
        //   // `);
        //   // document.body.appendChild(div);
        //
        //   console.log('view', view.state.doc.nodeAt(action.selection.$from.pos));
        //   console.log('nodesBetween');
        //   view.state.doc.nodesBetween(
        //     action.selection.$from.pos,
        //     action.selection.$to.pos,
        //     (node, pos, parent, index) => console.log('NODE::', node, pos)
        //   );
        //   view.updateState(
        //     view.state.applyAction(
        //       view.state.tr.addMark(
        //         action.selection.$from.pos,
        //         action.selection.$to.pos,
        //         // TODO add a mark (must first add a schema Mark though)
        //       ).action()
        //     )
        //   );
        // }
        // console.log('action', action);
        // console.log('transform', view.state.tr);

        // view.state.applyAction is ~= rootReducer(state, action)
        // This will create a new EditorState instance and then for each field
        // it will delegate to that fields applyAction(state, action) (reducer-like)
        // method to produce the next state for that field.
        const nextState = view.state.applyAction(action);

        // This is what triggers the rerender. We can call this anywhere and
        // it will rerender. If the state doesn't change though? Not sure.
        view.updateState(nextState);
      },
    });
  }

  // shouldComponentUpdate = () => false;

  // commands map very closely to action creators in traditional Flux. As a side
  // effect they dispatch the action they create. The difference is that the
  // commands have to have the state and dispatch injected, which is why we
  // have to use this applyCommand(command) rather than invoking command() directly.
  applyCommand(command) {
    command(this.view.state, this.view.props.onAction);
  }

  embolden = () => {
    console.log(this.view.state);
    console.log(schema.marks);
    this.applyCommand(toggleMark(schema.marks.strong));
  }

  crazyDivify = () => {
    // TODO a problem with toggleMark is if the selection is empty this will
    // cause any future typed chars to get the mark. This is not what we want.
    // So we probably just need to insert a marked char, but not toggle the Mark at all.
    // But we know this works atm so lets begin with this technique.
    this.applyCommand(toggleMark(schema.marks.crazyDiv));
  }

  updateLatex = (e) => {
    console.log('tr', this.view.state.tr);

    const latex = e.target.value;
    this.setState({ latex });

    const view = this.view;
    const { from, to } = view.state.selection;
    let state = view.state;
    if (state.doc.rangeHasMark(from, to, schema.marks.crazyDiv)) {
      state = state.applyAction(
        state.tr.removeMark(from, to, schema.marks.crazyDiv).action()
      );
    }
    state = state.applyAction(
      state.tr.addMark(from, to, schema.marks.crazyDiv.create({ latex })).action()
    );
    // const cmd = toggleMark(schema.marks.crazyDiv, { latex: 'c^2' });
    // cmd(state, (action) => {
    //   const nextState = state.applyAction(action);
    //   console.log('nextState', nextState);
    //   view.updateState(nextState);
    // });

    console.log('finalState', state);
    view.updateState(state);



    // const nextNode = owlImageType.create({ id: id++, latex })
    // const { selection } = view.state.tr;
    // console.log('selection', selection);
    // const state1 = view.state.applyAction(
    //   view.state.tr.replaceSelection(nextNode).action()
    // );
    // const state2 = state1.applyAction(
    //   state1.tr.setSelection(new Selection(selection.$from, selection.$to))
    // )
    // console.log('state2', state2);
    // view.updateState(state2);
  }

  render() {
    return (
      <div style={{ border: '1px solid #ddd' }}>
        {this.state.isOwlActive && (
          <div>
            <input value={this.state.latex} onChange={this.updateLatex} ref={node => this.input = node} />
            {/* <button onClick={this.updateLatex}>Update</button> */}
          </div>
        )}
        <button onClick={this.embolden}>BOLD</button>
        <button onClick={this.crazyDivify}>Crazy Divify</button>
        <div key="alwaysTheSame" ref={node => this.node = node} />
      </div>
    );
  }
}

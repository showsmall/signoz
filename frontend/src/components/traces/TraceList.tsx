import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { Table } from 'antd'

import { traceResponseNew, fetchTraces, pushDStree } from '../../actions';
import { StoreState } from '../../reducers'

interface TraceListProps {
  traces: traceResponseNew,
  fetchTraces: Function,
}

interface TableDataSourceItem {
  key: string;
  spanid: string;
  traceid: string;
  operationName: string;
  startTime: number;
  duration: number;
}
  

const _TraceList = (props: TraceListProps)  => {
      
      // PNOTE (TO DO) - Currently this use of useEffect gives warning. May need to memoise fetchtraces - https://stackoverflow.com/questions/55840294/how-to-fix-missing-dependency-warning-when-using-useeffect-react-hook

      useEffect( () => {
        props.fetchTraces();
      }, []);

      // PNOTE - code snippet - 
      // renderList(): JSX.Element[] {
      //   return this.props.todos.map((todo: Todo) => {
      //     return (
      //       <div onClick={() => this.onTodoClick(todo.id)} key={todo.id}>
      //         {todo.title}
      //       </div>
      //     );
      //   });
      // }

      const columns: any = [
        {
          title: 'Start Time (UTC Time)',
          dataIndex: 'startTime',
          key: 'startTime',
          sorter: (a:any, b:any) => a.startTime - b.startTime,
          sortDirections: ['descend', 'ascend'],
          render: (value: number) => (new Date(Math.round(value))).toUTCString()

          // new Date() assumes input in milliseconds. Start Time stamp returned by druid api for span list is in ms

          // render: (value: number) => (new Date(Math.round(value/1000))).toLocaleDateString()+' '+(new Date(Math.round(value/1000))).toLocaleTimeString()
        },
        {
          title: 'Duration (in ms)',
          dataIndex: 'duration',
          key: 'duration',
          sorter: (a:any, b:any) => a.duration - b.duration,
          sortDirections: ['descend', 'ascend'],
          render: (value: number) => (value/1000000).toFixed(2),
        },
        {
          title: 'Operation',
          dataIndex: 'operationName',
          key: 'operationName',
        },
        {
          title: 'TraceID',
          dataIndex: 'traceid',
          key: 'traceid',
          render: (text :string) => <NavLink to={'/traces/' + text}>{text.slice(-16)}</NavLink>,
          //only last 16 chars have traceID, druid makes it 32 by adding zeros
        },
      ];

    
     let dataSource :TableDataSourceItem[] = [];

     const renderTraces = () => {
     
        if (typeof props.traces[0]!== 'undefined' && props.traces[0].events.length > 0) {
                //PNOTE - Template literal should be wrapped in  curly braces for it to be evaluated
                
                // return props.traces.data[0].spans.map((item: spanItem) => <div key={item.spanID}>Span ID is {item.spanID} --- Trace id is <NavLink to={`traces/${item.traceID}`}>{item.traceID}</NavLink></div>)
                //dataSource.push({spanid:{item.spanID}},traceid:{item.traceID}}
                //Populating dataSourceArray
                props.traces[0].events.map((item: (number|string|string[]|pushDStree[])[], index ) => { 
                  if (typeof item[0] === 'number' && typeof item[4] === 'string' && typeof item[6] === 'string' && typeof item[1] === 'string' && typeof item[2] === 'string' )
                    dataSource.push({startTime: item[0],  operationName: item[4] , duration:parseInt(item[6]), spanid:item[1], traceid:item[2], key:index.toString()});
                });
                
                //antd table in typescript - https://codesandbox.io/s/react-typescript-669cv 

                return <Table dataSource={dataSource} columns={columns} size="middle"/>;
            } else 
            {
              //return <Skeleton active />;
              return <div> No spans found for given filter!</div>
            }
      
    };// end of renderTraces
      
      // console.log(props.traces.data);
      return(
        <div>
          <div>List of traces with spanID</div>
          <div>{renderTraces()}</div>
        </div>
      )

      // PNOTE - code snippet - 
      // return props.traces.data.map((item) => {
      //   return (
      //     <div key={item.traceID}>
      //       {item.traceID}
      //     </div>
      //   );
      // });
    
}

const mapStateToProps = (state: StoreState): { traces: traceResponseNew } => {
  // console.log(state);
  return {  traces : state.traces };
};
// the name mapStateToProps is only a convention
// take state and map it to props which are accessible inside this component

export const TraceList = connect(mapStateToProps, {
  fetchTraces: fetchTraces,
})(_TraceList);
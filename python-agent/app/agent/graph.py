# app/agent/graph.py
from langgraph.graph import StateGraph, END
from .state import TicketState
from .nodes import classify_node, retrieve_node, draft_node

def build_agent():
    graph = StateGraph(TicketState)
    graph.add_node("classify", classify_node)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("draft",    draft_node)
    graph.set_entry_point("classify")
    graph.add_edge("classify", "retrieve")
    graph.add_edge("retrieve", "draft")
    graph.add_edge("draft", END)
    return graph.compile()

agent = build_agent()
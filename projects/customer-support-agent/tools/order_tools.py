"""
Order Database Tools for AI Customer Support Agent.
"""
import json
import os
from typing import Dict, Any, Optional, List

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "orders.json")

def load_orders() -> List[Dict[str, Any]]:
    if not os.path.exists(DATA_PATH):
        return []
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def lookup_order(order_id: str) -> Dict[str, Any]:
    """
    Look up detailed shipment, tracking, and item data for a specific Order ID (e.g. ORD-9011).
    """
    order_id = order_id.strip().upper()
    orders = load_orders()
    for o in orders:
        if o["order_id"].upper() == order_id:
            return {
                "found": True,
                "order_id": o["order_id"],
                "customer_name": o["customer_name"],
                "status": o["status"],
                "carrier": o.get("carrier", "Unknown"),
                "tracking_number": o.get("tracking_number", "N/A"),
                "estimated_delivery": o.get("estimated_delivery") or o.get("delivery_date", "Pending"),
                "current_location": o.get("current_location", "Delivered / Final Destination"),
                "total_amount": o["total_amount"],
                "items": o["items"]
            }

    return {
        "found": False,
        "error": f"No order found with ID '{order_id}'. Please check the order number."
    }

def search_orders_by_customer(customer_name: str) -> Dict[str, Any]:
    """
    Search orders associated with a customer's full or partial name.
    """
    orders = load_orders()
    term = customer_name.strip().lower()
    matches = [o for o in orders if term in o["customer_name"].lower()]
    return {
        "count": len(matches),
        "orders": [
            {
                "order_id": m["order_id"],
                "customer": m["customer_name"],
                "status": m["status"],
                "amount": m["total_amount"]
            }
            for m in matches
        ]
    }

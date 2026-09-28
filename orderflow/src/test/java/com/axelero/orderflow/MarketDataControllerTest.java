package com.axelero.orderflow;

import com.axelero.orderflow.controller.OrderFlowController;
import com.axelero.orderflow.model.ExecutionEvent;
import com.axelero.orderflow.service.MatchingEngineService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.codec.ServerSentEvent;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class MarketDataControllerTest {

    @Test
    void shouldExposeBookEndpoint() {
        MatchingEngineService service = new MatchingEngineService(payload -> true, new ObjectMapper());
        OrderFlowController controller = new OrderFlowController(service);

        assertEquals(200, controller.getBook("ACME").getStatusCode().value());
    }

    @Test
    void shouldStreamTradeEventsAsServerSentEvents() {
        MatchingEngineService service = new MatchingEngineService(payload -> true, new ObjectMapper());
        OrderFlowController controller = new OrderFlowController(service);
        service.processOrder(order("sell", "SELL", 10L, 100_000L));
        service.processOrder(order("buy", "BUY", 10L, 100_000L));
        ServerSentEvent<ExecutionEvent> event = controller.streamExecutions("ACME").blockFirst();

        assertNotNull(event);
        assertEquals("trade", event.event());
        assertEquals(100_000L, event.data().getMatchPrice());
    }

    private com.axelero.orderflow.model.OrderMessage order(String id, String side, long quantity, long price) {
        com.axelero.orderflow.model.OrderMessage order = new com.axelero.orderflow.model.OrderMessage();
        order.setSchemaVersion(1);
        order.setType("NEW_ORDER");
        order.setClientOrderId(id);
        order.setInstrumentId("ACME");
        order.setSide(side);
        order.setOrderType("LIMIT");
        order.setQuantity(quantity);
        order.setLimitPrice(price);
        order.setTimeInForce("GTC");
        order.setClientTimestamp("2026-09-28T00:00:00Z");
        return order;
    }
}

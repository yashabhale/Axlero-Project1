package com.axelero.orderflow;

import com.axelero.orderflow.model.OrderMessage;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OrderMessageTest {

    @Test
    void validBuyLimitOrderPassesValidation() {
        OrderMessage order = new OrderMessage();
        order.setSchemaVersion(1);
        order.setType("NEW_ORDER");
        order.setClientOrderId("client-123");
        order.setInstrumentId("ACME");
        order.setSide("BUY");
        order.setOrderType("LIMIT");
        order.setQuantity(250L);
        order.setLimitPrice(123450L);
        order.setTimeInForce("GTC");
        order.setClientTimestamp("2026-09-27T10:15:30.000Z");

        assertDoesNotThrow(order::validate);
    }

    @Test
    void marketOrderWithPriceFailsValidation() {
        OrderMessage order = new OrderMessage();
        order.setSchemaVersion(1);
        order.setType("NEW_ORDER");
        order.setClientOrderId("client-456");
        order.setInstrumentId("ACME");
        order.setSide("SELL");
        order.setOrderType("MARKET");
        order.setQuantity(100L);
        order.setLimitPrice(100000L);
        order.setTimeInForce("IOC");
        order.setClientTimestamp("2026-09-27T10:16:00.000Z");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, order::validate);
        assertTrue(ex.getMessage().contains("limitPrice"));
    }
}

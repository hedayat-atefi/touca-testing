// Copyright 2021 Touca, Inc. Subject to Apache-2.0 License.

package io.touca.types;

import com.google.gson.JsonElement;
import com.google.gson.JsonPrimitive;

public final class BooleanType extends ToucaType {
  private Boolean value;

  public BooleanType(final Boolean value) {
    this.value = value;
  }

  @Override
  public final ToucaType.Types type() {
    return ToucaType.Types.Boolean;
  }

  @Override
  public JsonElement json() {
    return new JsonPrimitive(this.value);
  }
}
